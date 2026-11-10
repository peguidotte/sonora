"""Prepara Flyway CLI/PostgreSQL, sem compilar ou iniciar aplicações."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import tarfile
import tempfile
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent


def prepare(target, archive=None):
    target = target.resolve()
    if not target.is_relative_to(ROOT.parent / 'output'):
        raise ValueError('Runtime target must stay inside this checkout/output.')
    if target.exists() and (target.is_symlink() or not (target / 'source.json').is_file()):
        raise ValueError('Refusing to replace a directory not identified as generated Flyway runtime.')
    toolchain = json.loads((ROOT / 'toolchain.json').read_text(encoding='utf-8'))
    version = toolchain['version']
    with tempfile.TemporaryDirectory() as folder:
        staged = Path(folder) / 'runtime'
        if archive is None:
            archive = Path(folder) / 'flyway.tar.gz'
            with urlopen(toolchain['url'], timeout=120) as response, archive.open('wb') as output:
                shutil.copyfileobj(response, output)
        with archive.open('rb') as source:
            if hashlib.file_digest(source, 'sha256').hexdigest() != toolchain['sha256']:
                raise ValueError('Flyway archive SHA-256 mismatch.')
        required = {f'lib/flyway/{name}-{version}.jar' for name in
                    ('flyway-core', 'flyway-core-utilities', 'flyway-commandline', 'flyway-database-postgresql', 'flyway-command-mcp')}
        required.add('flyway')
        found = set()
        staged.mkdir()
        with tarfile.open(archive, 'r:gz') as bundle:
            for item in bundle:
                path = PurePosixPath(item.name)
                if path.is_absolute() or '..' in path.parts or path.parts[0] != 'flyway-' + version:
                    raise ValueError('Unexpected Flyway archive path.')
                relative = PurePosixPath(*path.parts[1:])
                name = relative.as_posix()
                selected = (name in required or name.startswith('licenses/') or
                            (len(relative.parts) == 2 and relative.parts[0] == 'lib' and name.endswith('.jar')) or
                            (name.startswith('drivers/postgresql-') and name.endswith('.jar')))
                if not selected or item.isdir():
                    continue
                if not item.isfile():
                    raise ValueError('Links/devices are not allowed in Flyway runtime.')
                destination = staged.joinpath(*relative.parts)
                destination.parent.mkdir(parents=True, exist_ok=True)
                with bundle.extractfile(item) as source, destination.open('wb') as output:
                    shutil.copyfileobj(source, output)
                destination.chmod(0o755 if name == 'flyway' else 0o644)
                found.add(name)
        if not required.issubset(found) or not any(n.startswith('drivers/postgresql-') for n in found):
            raise ValueError('Incomplete Flyway/PostgreSQL runtime.')
        (staged / 'source.json').write_text(json.dumps(toolchain, indent=2) + '\n', encoding='utf-8')
        if target.exists():
            # Absolute target checked above; only generated checkout/output data.
            shutil.rmtree(target)
        shutil.copytree(staged, target)
    print(f'Flyway {version} CLI/PostgreSQL prepared; Java 21 supplied by host, no application JAR required.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT.parent / 'output/tools/flyway')
    parser.add_argument('--archive', type=Path)
    args = parser.parse_args()
    prepare(args.output.resolve(), args.archive)
