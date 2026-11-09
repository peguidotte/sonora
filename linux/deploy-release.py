#!/usr/bin/env python3
"""Instala artefato privado por identidade da VM; nenhuma credencial do GitHub entra no host."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen


RELEASE_RE = re.compile(r'^[0-9a-f]{40}-[0-9]+-[0-9]+$')


def extract_release(archive, target):
    """Rejeita traversal, links, devices e expansão sem limite antes de extrair."""
    with tarfile.open(archive, 'r:gz') as bundle:
        members = bundle.getmembers()
        if len(members) > 50000 or sum(m.size for m in members) > 2 * 1024**3:
            raise ValueError('Artefato excede limite de tamanho/arquivos.')
        names = set()
        for member in members:
            path = PurePosixPath(member.name)
            if (not member.name or path.is_absolute() or '..' in path.parts
                    or path.as_posix() != member.name or path.as_posix() == '.'
                    or '\\' in member.name or ':' in member.name or member.name in names
                    or not (member.isfile() or member.isdir())):
                raise ValueError('Entrada de arquivo insegura.')
            names.add(member.name)
        bundle.extractall(target, members=members, filter='data')
        for member in members:
            path = target / member.name
            path.chmod(0o755 if member.isdir() or member.mode & 0o111 else 0o644)


def validate_manifest(target, component, release):
    manifest = json.loads((target / 'release.json').read_text())
    if manifest != {'component': component, 'releaseId': release, 'commit': release[:40]}:
        raise ValueError('Proveniência do artefato não confere.')
    required = ['provision.sh', 'monitor.sh', 'network.sh', 'verify.sh', 'deploy-release.py'] if component == 'infra' else ['bin/start.sh']
    if component == 'soa':
        required.append('bin/migrate.sh')
    for name in required:
        if not (target / name).is_file():
            raise ValueError(f'Arquivo obrigatório ausente: {name}')


def fetch_archive(account, component, release, destination, expected_hash):
    query = urlencode({'api-version': '2018-02-01', 'resource': 'https://storage.azure.com/'})
    request = Request('http://169.254.169.254/metadata/identity/oauth2/token?' + query,
                      headers={'Metadata': 'true'})
    with urlopen(request, timeout=15) as response:
        token = json.load(response)['access_token']
    request = Request(f'https://{account}.blob.core.windows.net/releases/{component}/{release}.tar.gz',
                      headers={'Authorization': 'Bearer ' + token, 'x-ms-version': '2023-11-03'})
    digest = hashlib.sha256()
    count = 0
    with urlopen(request, timeout=60) as response, destination.open('wb') as output:
        while chunk := response.read(1024 * 1024):
            count += len(chunk)
            if count > 1024**3:
                raise ValueError('Download excede 1 GiB.')
            digest.update(chunk)
            output.write(chunk)
    if digest.hexdigest() != expected_hash:
        raise ValueError('SHA-256 do artefato não confere.')


def run(*args):
    subprocess.run(args, check=True)


def health(component):
    port, prefix, secret = ((8080, '/api/sonora/v1', 'api-operator') if component == 'api'
                             else (8082, '/api/ingestion/v1', 'soa-operator'))
    key = Path(f'/etc/sonora/admin/{secret}.key').read_text().strip()
    for _ in range(40):
        try:
            for suffix in ('live', 'ready'):
                request = Request(f'http://127.0.0.1:{port}{prefix}/health/{suffix}',
                                  headers={'X-Api-Key': key})
                with urlopen(request, timeout=5) as response:
                    if response.status != 200 or response.headers.get('X-Demo-Mode'):
                        raise ValueError('Healthcheck inválido ou mock.')
            return
        except Exception:
            time.sleep(3)
    raise RuntimeError('Healthcheck falhou; conferir journalctl sem expor credenciais.')


def switch_link(link, target):
    temporary = link.with_name(link.name + '.new')
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(target, target_is_directory=True)
    temporary.replace(link)


def deploy(args):
    import fcntl
    if os.geteuid() != 0:
        raise PermissionError('Executar como root pelo Azure Run Command.')
    with open('/run/sonora-deploy.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        with tempfile.TemporaryDirectory(prefix='release-', dir='/var/lib/sonora/incoming') as temporary:
            temporary = Path(temporary)
            archive = temporary / 'release.tar.gz'
            fetch_archive(args.account, args.component, args.release, archive, args.sha256)
            extracted = temporary / 'unpacked'
            extracted.mkdir()
            extract_release(archive, extracted)
            validate_manifest(extracted, args.component, args.release)
            if args.component == 'infra':
                if not re.fullmatch(r'[a-z0-9][a-z0-9.-]+\.[a-z]{2,}', args.fqdn or ''):
                    raise ValueError('FQDN inválido.')
                for name in ('provision.sh', 'monitor.sh', 'network.sh', 'verify.sh', 'deploy-release.py'):
                    shutil.copyfile(extracted / name, Path('/opt/sonora/bootstrap') / name)
                run('/bin/bash', '/opt/sonora/bootstrap/provision.sh', args.fqdn)
                return
            root = Path('/opt/sonora') / args.component
            release = root / 'releases' / args.release
            if release.exists():
                if (release / '.sha256').read_text().strip() != args.sha256:
                    raise ValueError('Release existente com conteúdo diferente.')
            else:
                shutil.move(str(extracted), release)
                (release / '.sha256').write_text(args.sha256 + '\n')
            previous = (root / 'current').resolve() if (root / 'current').is_symlink() else None
            if args.component == 'soa':
                # Backup antes de migrations. Nunca fazer rollback automático do banco.
                backup = f'/var/backups/sonora/{args.release}.dump'
                if not Path(backup).exists():
                    run('runuser', '-u', 'postgres', '--', 'pg_dump', '-Fc', '-f', backup, 'sonora')
                run('systemd-run', '--quiet', '--wait', '--pipe', '--collect',
                    '--unit=sonora-migrate-' + args.release, '--uid=sonora-migrator', '--gid=sonora-migrator',
                    '-p', 'EnvironmentFile=/etc/sonora/migrator.env',
                    '-p', 'WorkingDirectory=' + str(release), '-p', 'NoNewPrivileges=true',
                    '/bin/bash', str(release / 'bin/migrate.sh'))
            switch_link(root / 'current', release)
            try:
                run('systemctl', 'enable', 'sonora-' + args.component)
                run('systemctl', 'restart', 'sonora-' + args.component)
                health(args.component)
            except Exception:
                if previous and previous != release:
                    switch_link(root / 'current', previous)
                    run('systemctl', 'restart', 'sonora-' + args.component)
                    print('Binário anterior restaurado; compatibilidade de schema exige avaliação. Backup preservado.')
                else:
                    run('systemctl', 'stop', 'sonora-' + args.component)
                raise
            print(json.dumps({'component': args.component, 'releaseId': args.release, 'status': 'healthy'}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('component', choices=['api', 'soa', 'infra'])
    parser.add_argument('release')
    parser.add_argument('account')
    parser.add_argument('sha256')
    parser.add_argument('--fqdn')
    args = parser.parse_args()
    if (not RELEASE_RE.fullmatch(args.release) or not re.fullmatch(r'[a-z0-9]{3,24}', args.account)
            or not re.fullmatch(r'[a-f0-9]{64}', args.sha256)):
        parser.error('Identificadores inválidos.')
    deploy(args)


if __name__ == '__main__':
    main()
