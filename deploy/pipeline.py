"""Bootstrap Azure, empacotamento e publicação. Sem senha Azure ou chave SSH nos pipelines."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'deploy/azure'
REPOSITORY = 'peguidotte/sonora'
INFRA_FILES = ('provision.sh', 'monitor.sh', 'deploy-release.py')


def command(program):
    found = shutil.which(program)
    if not found:
        raise RuntimeError(f'Instale {program}.')
    # Executar o Python da Azure CLI evita quoting de JSON pelo wrapper .cmd no Windows.
    if program == 'az' and found.lower().endswith('.cmd'):
        interpreter = Path(found).parent.parent / 'python.exe'
        if interpreter.exists():
            return [str(interpreter), '-X', 'utf8', '-IBm', 'azure.cli']
    return [found]


def execute(args, cwd=ROOT, capture=False, check=True):
    result = subprocess.run(args, cwd=cwd, text=True, encoding='utf-8',
                            stdout=subprocess.PIPE if capture else None,
                            stderr=subprocess.PIPE if capture else None, check=False)
    if check and result.returncode:
        # Não imprimir automaticamente payloads/variáveis com potenciais credenciais.
        raise RuntimeError(f'Comando {Path(args[0]).name} falhou (exit={result.returncode}). '
                           + ((result.stderr or '')[-1500:] if capture else ''))
    return result


def az(*args):
    result = execute(command('az') + list(args) + ['--output', 'json'], capture=True)
    return json.loads(result.stdout) if result.stdout.strip() else None


def assign(scope, principal, role):
    name = str(uuid.uuid5(uuid.NAMESPACE_URL, f'{scope}/{principal}/{role}'))
    return az('role', 'assignment', 'create', '--name', name, '--assignee-object-id', principal,
              '--assignee-principal-type', 'User' if principal == os.environ.get('SONORA_BOOTSTRAP_USER') else 'ServicePrincipal',
              '--role', role, '--scope', scope)


def require_student_limit(subscription):
    info = az('rest', '--method', 'get', '--url',
              f'https://management.azure.com/subscriptions/{subscription}?api-version=2022-12-01')
    policies = info.get('subscriptionPolicies', {})
    if (info.get('state') != 'Enabled' or policies.get('spendingLimit') != 'On'
            or not policies.get('quotaId', '').startswith('AzureForStudents')):
        raise RuntimeError('Requer Azure for Students ativa e spendingLimit=On. Não habilitar cobrança adicional.')
    return info


def bootstrap(args):
    subscription = args.subscription
    az('account', 'set', '--subscription', subscription)
    require_student_limit(subscription)
    group = 'sonora-gs-rg'
    suffix = hashlib.sha256(f'{subscription}/{group}'.encode()).hexdigest()[:10]
    state_account = f'sonora{suffix}state'
    groups = az('group', 'list')
    existing = next((g for g in groups if g['name'] == group), None)
    if existing and existing.get('tags', {}).get('project') != 'Sonora':
        raise RuntimeError('Grupo existente não identificado como Sonora; não adotar automaticamente.')
    az('group', 'create', '--name', group, '--location', args.location,
       '--tags', 'project=Sonora', 'course=FIAP-GS-2026-02', 'managed_by=SonoraBootstrap')
    scope = f'/subscriptions/{subscription}/resourceGroups/{group}'
    user = az('ad', 'signed-in-user', 'show')['id']
    os.environ['SONORA_BOOTSTRAP_USER'] = user
    assign(scope, user, 'Storage Blob Data Contributor')
    storage = az('storage', 'account', 'list', '--resource-group', group)
    if not any(s['name'] == state_account for s in storage):
        az('storage', 'account', 'create', '--name', state_account, '--resource-group', group,
           '--location', args.location, '--sku', 'Standard_LRS', '--kind', 'StorageV2',
           '--min-tls-version', 'TLS1_2', '--https-only', 'true',
           '--allow-blob-public-access', 'false', '--allow-shared-key-access', 'false')
    for attempt in range(18):
        try:
            az('storage', 'container', 'create', '--account-name', state_account,
               '--name', 'tfstate', '--auth-mode', 'login')
            break
        except RuntimeError:
            if attempt == 17:
                raise
            time.sleep(5)
    identity = az('identity', 'create', '--name', 'sonora-gs-infra', '--resource-group', group, '--location', args.location)
    for role in ('Contributor', 'Role Based Access Control Administrator', 'Storage Blob Data Contributor'):
        assign(scope, identity['principalId'], role)
    az('identity', 'federated-credential', 'create', '--name', 'github-main', '--identity-name', identity['name'],
       '--resource-group', group, '--issuer', 'https://token.actions.githubusercontent.com',
       '--subject', f'repo:{REPOSITORY}:ref:refs/heads/main', '--audiences', 'api://AzureADTokenExchange')
    key = Path.home() / '.ssh/sonora_azure_ed25519'
    key.parent.mkdir(mode=0o700, exist_ok=True)
    if not key.exists():
        execute(command('ssh-keygen') + ['-t', 'ed25519', '-f', str(key), '-N', '', '-C', 'sonora-gs-admin'])
    variables = {'subscription_id': subscription, 'resource_group_name': group, 'location': args.location,
                 'vm_size': args.vm_size, 'architecture': args.architecture,
                 'admin_ssh_public_key': key.with_suffix('.pub').read_text().strip()}
    (CONFIG / 'terraform.tfvars.json').write_text(json.dumps(variables, indent=2) + '\n', encoding='utf-8')
    backend = {'resource_group_name': group, 'storage_account_name': state_account,
               'container_name': 'tfstate', 'key': 'sonora.tfstate', 'use_azuread_auth': True}
    (CONFIG / 'backend.tfbackend').write_text(''.join(f'{k} = {json.dumps(v)}\n' for k, v in backend.items()), encoding='utf-8')
    runtime = {'subscription': subscription, 'tenant': identity['tenantId'], 'infraClientId': identity['clientId'],
               'backend': backend, 'variables': variables}
    (CONFIG / 'runtime.local.json').write_text(json.dumps(runtime, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'bootstrap': 'ready', 'resourceGroup': group, 'stateStorage': state_account}))


def inventory():
    specs = json.loads((ROOT / 'deploy/pipeline.json').read_text())
    result = {}
    for component in ('api', 'soa', 'mobile'):
        directory = ROOT / component
        patterns = {'api': ('*.csproj',), 'soa': ('pom.xml', '*.java'), 'mobile': ('package.json', '*.tsx')}[component]
        sources = any(any(directory.rglob(pattern)) for pattern in patterns)
        ready = (ROOT / specs[component]['project']).is_file()
        if sources and not ready:
            raise RuntimeError(f'{component}: há código, mas project em deploy/pipeline.json não corresponde à entrega.')
        result[component] = ready
    path = os.environ.get('GITHUB_OUTPUT')
    if path:
        with open(path, 'a', encoding='utf-8') as output:
            for component, ready in result.items():
                output.write(f'{component}={str(ready).lower()}\n')
            matrix = [{'component': c, 'sdk': specs['api']['dotnetSdk'], 'java': specs['soa']['javaVersion']}
                      for c in ('soa', 'api') if result[c]]
            output.write('backends=' + json.dumps({'include': matrix}) + '\n')
            output.write(f'has_backends={str(bool(matrix)).lower()}\n')
    print(json.dumps(result))
    return result


def release_id():
    commit = os.environ.get('GITHUB_SHA') or execute(command('git') + ['rev-parse', 'HEAD'], capture=True).stdout.strip()
    value = f"{commit}-{os.environ.get('GITHUB_RUN_ID', '0')}-{os.environ.get('GITHUB_RUN_ATTEMPT', '0')}"
    if not re.fullmatch(r'[a-f0-9]{40}-[0-9]+-[0-9]+', value):
        raise ValueError('Release ID inválido.')
    return value


def package(args):
    component = args.component
    specs = json.loads((ROOT / 'deploy/pipeline.json').read_text())
    release = release_id()
    out = ROOT / 'output/releases'
    out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        temporary = Path(temporary)
        if component == 'infra':
            for name in INFRA_FILES:
                shutil.copyfile(ROOT / 'linux' / name, temporary / name)
        else:
            (temporary / 'bin').mkdir()
            app = temporary / 'app'
            if component == 'api':
                rid = os.environ.get('DOTNET_RUNTIME_IDENTIFIER', 'linux-arm64')
                if rid not in ('linux-arm64', 'linux-x64'):
                    raise ValueError('RID inválido.')
                execute(command('dotnet') + ['test', specs['api']['tests'], '--configuration', 'Release'])
                execute(command('dotnet') + ['publish', specs['api']['project'], '-c', 'Release', '-r', rid,
                                             '--self-contained', 'true', '-o', str(app)])
                executable = specs['api']['executable']
                if not re.fullmatch(r'[A-Za-z0-9_.-]+', executable) or not (app / executable).is_file():
                    raise ValueError('Executável C# não encontrado.')
                (app / executable).chmod(0o755)
                start = f'#!/bin/bash\nset -euo pipefail\nexec ./app/{executable}\n'
            else:
                execute(command('mvn') + ['-B', '-f', specs['soa']['project'], 'verify'])
                jars = [p for p in (ROOT / specs['soa']['project']).parent.glob('target/*.jar')
                        if not p.name.endswith(('-sources.jar', '-javadoc.jar', '-tests.jar'))]
                if len(jars) != 1:
                    raise ValueError('SOA deve gerar um único JAR executável em target/.')
                app.mkdir()
                shutil.copyfile(jars[0], app / 'sonora.jar')
                migrate = ROOT / specs['soa']['migrate']
                if not migrate.is_file():
                    raise ValueError('SOA precisa fornecer script de migrations standalone.')
                shutil.copyfile(migrate, temporary / 'bin/migrate.sh')
                start = '#!/bin/bash\nset -euo pipefail\nexec java -Xmx512m -jar ./app/sonora.jar\n'
            (temporary / 'bin/start.sh').write_text(start, encoding='utf-8')
        (temporary / 'release.json').write_text(json.dumps({'component': component, 'releaseId': release,
                                                           'commit': release[:40]}) + '\n', encoding='utf-8')
        archive = out / f'{component}.tar.gz'
        with tarfile.open(archive, 'w:gz') as bundle:
            for item in sorted(temporary.rglob('*')):
                if item.is_symlink():
                    raise ValueError('Links não são permitidos no pacote de deploy.')
                bundle.add(item, arcname=item.relative_to(temporary).as_posix(), recursive=False)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        (out / f'{component}.json').write_text(json.dumps({'releaseId': release, 'sha256': digest}) + '\n')
        print(json.dumps({'component': component, 'releaseId': release, 'sha256': digest}))


def publish(args):
    component = args.component
    group = os.environ['AZURE_RESOURCE_GROUP']
    vm = os.environ['AZURE_VM_NAME']
    account = os.environ['AZURE_RELEASE_STORAGE']
    require_student_limit(os.environ['AZURE_SUBSCRIPTION_ID'])
    metadata = json.loads((ROOT / f'output/releases/{component}.json').read_text())
    release, digest = metadata['releaseId'], metadata['sha256']
    if (not re.fullmatch(r'[a-f0-9]{40}-[0-9]+-[0-9]+', release)
            or not re.fullmatch(r'[a-f0-9]{64}', digest)
            or not re.fullmatch(r'[a-z0-9]{3,24}', account)):
        raise ValueError('Metadados inválidos.')
    archive = ROOT / f'output/releases/{component}.tar.gz'
    if hashlib.sha256(archive.read_bytes()).hexdigest() != digest:
        raise ValueError('SHA-256 local não confere; não publicar.')
    blob_args = ['--account-name', account, '--container-name', 'releases',
                 '--name', f'{component}/{release}.tar.gz', '--auth-mode', 'login']
    if az('storage', 'blob', 'exists', *blob_args)['exists']:
        existing = az('storage', 'blob', 'show', *blob_args)
        if existing.get('metadata', {}).get('sha256') != digest:
            raise ValueError('Blob existente com conteúdo/proveniência diferente; gerar nova release.')
    else:
        az('storage', 'blob', 'upload', *blob_args, '--file', str(archive),
           '--metadata', 'sha256=' + digest, '--overwrite', 'false')
    script = 'set -eu\ncloud-init status --wait >/dev/null\n'
    script += f'/usr/local/sbin/sonora-deploy {component} {release} {account} {digest}'
    if component == 'infra':
        origin = os.environ['API_BASE_URL']
        if not re.fullmatch(r'https://[a-z0-9.-]+', origin):
            raise ValueError('Origem HTTPS inválida.')
        script += ' --fqdn ' + origin.removeprefix('https://')
    marker = f'SONORA_DEPLOY_OK {component} {release}'
    script += f"\nprintf '\\n{marker}\\n'"
    with tempfile.TemporaryDirectory() as temporary:
        path = Path(temporary) / 'deploy.sh'
        path.write_text(script + '\n', encoding='utf-8')
        response = az('vm', 'run-command', 'invoke', '--resource-group', group, '--name', vm,
                      '--command-id', 'RunShellScript', '--scripts', '@' + str(path))
    statuses = response.get('value', [])
    if not statuses or any(s.get('code', '').endswith('/failed') for s in statuses):
        raise RuntimeError('Azure Run Command falhou.')
    for status in statuses:
        print(status.get('message', ''))
    # Run Command V1 pode retornar provisioning success apesar de exit não zero do shell.
    stdout = '\n'.join(s.get('message', '') for s in statuses)
    if marker not in stdout.splitlines():
        raise RuntimeError('Ausência de confirmação de sucesso no deploy. Conferir logs da VM.')


def configure(args):
    runtime = json.loads((CONFIG / 'runtime.local.json').read_text())
    result = execute([args.terraform, '-chdir=deploy/azure', 'output', '-json'], capture=True)
    outputs = {k: v['value'] for k, v in json.loads(result.stdout).items()}
    variables = {'AZURE_SUBSCRIPTION_ID': runtime['subscription'], 'AZURE_TENANT_ID': runtime['tenant'],
                 'AZURE_INFRA_CLIENT_ID': runtime['infraClientId'], 'AZURE_CLIENT_ID': outputs['deploy_client_id'],
                 'AZURE_RESOURCE_GROUP': outputs['resource_group_name'], 'AZURE_VM_NAME': outputs['vm_name'],
                 'AZURE_RELEASE_STORAGE': outputs['release_storage_account'], 'API_BASE_URL': outputs['public_origin'],
                 'SOA_BASE_URL': outputs['public_origin'], 'DOTNET_RUNTIME_IDENTIFIER': outputs['dotnet_runtime_identifier'],
                 'TF_BACKEND': json.dumps(runtime['backend']), 'TF_VARS': json.dumps(runtime['variables'])}
    # Somente IDs/configuração pública. Chaves de API e senhas não são exportadas.
    for name, value in variables.items():
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / 'value.txt'
            path.write_text(value, encoding='utf-8')
            with path.open(encoding='utf-8') as source:
                subprocess.run(command('gh') + ['variable', 'set', name, '--repo', REPOSITORY],
                               cwd=ROOT, stdin=source, check=True)
    print(json.dumps({'github': 'configured', 'origin': outputs['public_origin']}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='action', required=True)
    boot = commands.add_parser('bootstrap')
    boot.add_argument('--subscription', required=True)
    boot.add_argument('--location', default='centralus')
    boot.add_argument('--vm-size', default='Standard_B2pls_v2')
    boot.add_argument('--architecture', choices=['arm64', 'x64'], default='arm64')
    commands.add_parser('inventory')
    for action in ('package', 'publish'):
        sub = commands.add_parser(action)
        sub.add_argument('component', choices=['infra', 'soa', 'api'])
    config = commands.add_parser('configure')
    config.add_argument('--terraform', default='terraform')
    args = parser.parse_args()
    if args.action == 'inventory':
        inventory()
    else:
        globals()[{'package': 'package', 'publish': 'publish', 'bootstrap': 'bootstrap', 'configure': 'configure'}[args.action]](args)


if __name__ == '__main__':
    main()
