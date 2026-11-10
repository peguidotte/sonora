"""VM VirtualBox descartável no Windows; console por named pipe, sem portas públicas/Azure."""
import argparse
import base64
import ctypes
from ctypes import wintypes
from datetime import datetime, timezone
import hashlib
import html
import io
import json
import msvcrt
import os
from pathlib import Path
import re
import shutil
import subprocess
import time
import uuid
import zipfile
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
IMAGE_URL = 'https://cloud-images.ubuntu.com/noble/20261017/noble-server-cloudimg-amd64.vmdk'
IMAGE_SHA256 = '9a1e3959c9f4ad9d4752101fd4ff9a43191fb7d72e61fa20e033f9fd235ce794'
FILES = ['provision.sh', 'network.sh', 'monitor.sh', 'verify.sh', 'deploy-release.py', 'lab.sh']
PHASES = ['baseline', 'provision', 'verify', 'reprovision', 'network-static', 'network-timeout',
          'network-dhcp', 'before-reboot', 'after-reboot', 'delivery-pending', 'collect']


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def execute(*args):
    return subprocess.check_output(list(map(str, args)), text=True, encoding='utf-8', errors='replace').strip()


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def prepare(folder, vbox):
    import pycdlib  # Dependência somente do criador da ISO, não do provisionamento/CI.
    if folder.exists():
        raise ValueError('Diretório já existe: use outro para uma VM nova; não sobrescrever laboratório.')
    identifier = uuid.uuid4().hex[:12]
    folder.mkdir(parents=True)
    evidence = ROOT / 'output/evidence/linux' / ('lab-' + identifier)
    evidence.mkdir(parents=True)
    cache = Path.home() / '.cache/sonora-tools'
    cache.mkdir(parents=True, exist_ok=True)
    image = cache / 'noble-server-cloudimg-amd64-20261017.vmdk'
    if not image.exists():
        with urlopen(IMAGE_URL, timeout=60) as response, image.open('wb') as output:
            shutil.copyfileobj(response, output)
    if digest(image) != IMAGE_SHA256:
        raise ValueError('Imagem Ubuntu não corresponde ao SHA-256 fixado.')
    name = 'sonora-linux-lab-' + identifier
    pipe = '\\\\.\\pipe\\' + name
    state = {'name': name, 'pipe': pipe, 'evidence': str(evidence), 'vbox': str(vbox),
             'imageUrl': IMAGE_URL, 'imageSha256': IMAGE_SHA256,
             'sourceCommit': execute('git', '-C', ROOT, 'rev-parse', 'HEAD'),
             'sourceWorktreeDirty': bool(execute('git', '-C', ROOT, 'status', '--porcelain', '--', 'linux')),
             'sourceFiles': {name: digest(ROOT / 'linux' / name) for name in FILES + ['lab.py']},
             'virtualBoxVersion': execute(vbox, '--version'),
             'virtualMachine': {'cpus': 1, 'memoryMiB': 1536, 'network': 'NAT', 'architecture': 'amd64'},
             'createdAt': datetime.now(timezone.utc).isoformat()}
    write_files = [{'path': '/opt/sonora/bootstrap/' + name, 'encoding': 'b64', 'permissions': '0700',
                    'content': base64.b64encode((ROOT / 'linux' / name).read_bytes()).decode()} for name in FILES]
    write_files += [
        {'path': '/etc/sonora-lab.json', 'permissions': '0600', 'content': json.dumps(state, indent=2)},
        {'path': '/etc/systemd/system/serial-getty@ttyS0.service.d/lab.conf',
         'content': '[Service]\nExecStart=\nExecStart=-/sbin/agetty --autologin root --noclear %I 115200 vt100\n'},
        {'path': '/etc/apt/apt.conf.d/99-sonora-lab-network',
         'content': 'Acquire::ForceIPv4 "true";\nAcquire::Retries "1";\nAcquire::http::Timeout "20";\nAcquire::https::Timeout "20";\n'},
    ]
    # Autologin restrito ao console por named pipe local. Não habilita senha/SSH de root.
    config = {'ssh_pwauth': False, 'disable_root': True, 'write_files': write_files,
              'apt': {'preserve_sources_list': False,
                      'primary': [{'arches': ['default'], 'uri': 'https://archive.ubuntu.com/ubuntu'}],
                      'security': [{'arches': ['default'], 'uri': 'https://security.ubuntu.com/ubuntu'}]},
              'runcmd': [['systemctl', 'daemon-reload'], ['systemctl', 'restart', 'serial-getty@ttyS0']],
              'final_message': 'SONORA_LAB_CLOUD_INIT_COMPLETE'}
    seed = pycdlib.PyCdlib()
    seed.new(interchange_level=3, joliet=3, vol_ident='CIDATA')
    for file_name, content in {
        'user-data': '#cloud-config\n' + json.dumps(config),
        'meta-data': json.dumps({'instance-id': identifier, 'local-hostname': 'sonora-lab-clean'}),
        'network-config': json.dumps({'version': 2, 'ethernets': {'enp0s3': {
            'dhcp4': True, 'accept-ra': False, 'dhcp4-overrides': {'use-dns': False},
            'nameservers': {'addresses': ['10.0.2.3']}}}}),
    }.items():
        data = content.encode()
        seed.add_fp(io.BytesIO(data), len(data), iso_path='/' + file_name.upper().replace('-', '_') + ';1', joliet_path='/' + file_name)
    seed.write(str(folder / 'seed.iso'))
    seed.close()
    execute(vbox, 'createvm', '--name', name, '--basefolder', folder / 'vm', '--ostype', 'Ubuntu_64', '--register')
    state['uuid'] = re.search(r'^UUID="([^"]+)"', execute(vbox, 'showvminfo', name, '--machinereadable'), re.M)[1]
    save(folder / 'lab.local.json', state)
    # O VMDK oficial tem UUID zero: uma cópia por VM evita colisão no registro de mídias.
    source_disk = folder / 'source.vmdk'
    shutil.copyfile(image, source_disk)
    execute(vbox, 'clonemedium', 'disk', source_disk, folder / 'root.vdi', '--format', 'VDI')
    execute(vbox, 'modifymedium', 'disk', folder / 'root.vdi', '--resize', '16384')
    execute(vbox, 'modifyvm', name, '--memory', '1536', '--cpus', '1', '--firmware', 'efi',
            '--graphicscontroller', 'vmsvga', '--vram', '16', '--nic1', 'nat', '--nic-type1', '82540EM',
            '--natdnsproxy1', 'on', '--natdnshostresolver1', 'on',
            '--uart1', '0x3F8', '4', '--uart-mode1', 'server', pipe, '--boot1', 'disk')
    execute(vbox, 'storagectl', name, '--name', 'SATA', '--add', 'sata', '--controller', 'IntelAhci', '--portcount', '2')
    for port, kind, medium in [(0, 'hdd', folder / 'root.vdi'), (1, 'dvddrive', folder / 'seed.iso')]:
        execute(vbox, 'storageattach', name, '--storagectl', 'SATA', '--port', str(port), '--device', '0', '--type', kind, '--medium', medium)
    save(evidence / 'environment.json', state)
    print('VM criada: ' + name + '; evidências: ' + str(evidence), flush=True)


class Console:
    def __init__(self, state):
        self.state = state
        self.evidence = Path(state['evidence'])
        self.started = time.monotonic()
        self.pipe = None
        self.peek = ctypes.WinDLL('kernel32', use_last_error=True).PeekNamedPipe
        self.peek.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD,
                              wintypes.LPVOID, ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
        self.peek.restype = wintypes.BOOL
        self.cast = (self.evidence / 'terminal.cast').open('w', encoding='utf-8')
        self.cast.write(json.dumps({'version': 2, 'width': 120, 'height': 36,
                                  'timestamp': int(time.time()), 'title': 'Sonora — laboratório Linux real'}) + '\n')

    def connect(self):
        for _ in range(100):
            try:
                self.pipe = open(self.state['pipe'], 'r+b', buffering=0)
                return
            except OSError:
                time.sleep(0.2)
        raise TimeoutError('Console VirtualBox indisponível.')

    def read(self):
        available = wintypes.DWORD()
        if not self.peek(msvcrt.get_osfhandle(self.pipe.fileno()), None, 0, None, ctypes.byref(available), None):
            raise OSError('Console desconectado.')
        if available.value:
            data = self.pipe.read(available.value).decode('utf-8', errors='replace')
            self.cast.write(json.dumps([round(time.monotonic() - self.started, 3), 'o', data], ensure_ascii=False) + '\n')
            self.cast.flush()
            return data
        return ''

    def command(self, command, label, timeout=180, confirm=False):
        token = 'LAB_DONE_' + uuid.uuid4().hex
        marker = re.compile(token + r':(\d+)')
        result = ''
        confirmed = False
        start = time.monotonic()
        self.pipe.write((command + f'; printf "\\n{token}:%s\\n" "$?"\n').encode())
        log = self.evidence / (label + '.log')
        with log.open('w', encoding='utf-8') as output:
            while time.monotonic() - start < timeout:
                data = self.read()
                if data:
                    output.write(data)
                    output.flush()
                    result += data
                    if confirm and not confirmed and 'Changes will revert in' in result:
                        self.pipe.write(b'\r')
                        confirmed = True
                    found = marker.search(result)
                    if found:
                        code = int(found[1])
                        print(label + ': exit=' + str(code), flush=True)
                        if code:
                            raise RuntimeError(label + ' falhou; conferir ' + str(log))
                        return {'phase': label, 'exitCode': code, 'durationSeconds': round(time.monotonic() - start, 2)}
                if not data:
                    time.sleep(0.002)
        raise TimeoutError(label + ' excedeu o tempo; conferir ' + str(log))

    def ready(self, label, reboot=False):
        time.sleep(3)
        self.pipe.write(b'\n')
        # A imagem precisa concluir cloud-init e iniciar o autologin antes dos comandos.
        result = ''
        with (self.evidence / (label + '.log')).open('w', encoding='utf-8') as output:
            deadline = time.monotonic() + 600
            while time.monotonic() < deadline:
                data = self.read()
                output.write(data)
                output.flush()
                result += data
                boot = result.find('Linux version') if reboot else 0
                if boot >= 0 and re.search(r'root@[^\r\n]+[#]', result[boot:]):
                    return
                if not data:
                    time.sleep(0.002)
        raise TimeoutError('Boot não chegou ao console root do laboratório.')


def evidence_index(evidence, state, results, status):
    rows = ''.join(f'<tr><td>{html.escape(row["phase"])}</td><td>{row["durationSeconds"]} s</td>'
                   f'<td><a href="{row["phase"]}.log">Log real</a></td></tr>' for row in results)
    content = f'''<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<title>Sonora — evidências Linux</title><style>
body{{font:17px system-ui;max-width:1000px;margin:40px auto;padding:0 24px;color:#172536}}
table{{border-collapse:collapse;width:100%}}td,th{{padding:10px;border-bottom:1px solid #ccd5dd;text-align:left}}
aside{{background:#fff3cf;padding:16px}}code{{overflow-wrap:anywhere}}</style>
<h1>Sonora — laboratório Linux</h1><p>Estado: <strong>{html.escape(status)}</strong>.</p>
<p>VM local VirtualBox, Ubuntu 24.04 amd64, uma interface NAT. Não é evidência de deploy Azure/ARM64.</p>
<aside>Entrega acadêmica incompleta: falta aplicação funcional de outra disciplina com banco de domínio e a demonstração final.</aside>
<p>Commit-base: <code>{state['sourceCommit']}</code>. Os hashes dos arquivos testados estão em
<a href="environment.json">environment.json</a>; alterações locais: {state.get('sourceWorktreeDirty', True)}.</p>
<table><tr><th>Etapa concluída</th><th>Duração</th><th>Evidência</th></tr>{rows}</table>
<p><a href="00-clean-boot.log">Primeiro boot</a> · <a href="terminal.cast">Gravação de terminal</a> ·
<a href="results.json">Resultados</a> · <a href="sha256.json">Hashes</a></p>
<h2>Seleção para vídeo de até sete minutos</h2>
<ol><li>Contexto e estado limpo (30 s).</li><li>Provisionamento e reexecução (60 s; identificar cortes/aceleração).</li>
<li>IP, DNS, aplicação de rede e rollback (70 s).</li><li>Monitor, carga, alerta e recuperação após crash (60 s).</li>
<li>Reboot real, serviços e persistência (40 s).</li><li>Reservar 100 s para aplicação real/banco/falha, ainda pendentes.</li>
<li>Logs e limites da entrega (30 s).</li></ol>
<p>Logs e terminal.cast preservam a execução original. Abrir a gravação em um player compatível com asciicast v2.
Não apresentar simulação, aplicação ausente ou trecho não executado como concluído.</p></html>'''
    (evidence / 'index.html').write_text(content, encoding='utf-8')


def run(folder, state):
    evidence = Path(state['evidence'])
    if (evidence / 'terminal.cast').exists():
        raise ValueError('Execução já iniciada; preservar evidências e criar outro laboratório para repetir.')
    save(evidence / 'execution.json', {'controllerAtRunSha256': digest(Path(__file__)),
                                      'startedAt': datetime.now(timezone.utc).isoformat()})
    execute(state['vbox'], 'startvm', state['uuid'], '--type', 'headless')
    console = Console(state)
    results = []
    status = 'incomplete'
    try:
        console.connect()
        console.ready('00-clean-boot')
        for index, phase in enumerate(PHASES, 1):
            if phase == 'after-reboot':
                console.pipe.write(b'systemctl reboot\n')
                console.ready('09-reboot-console', reboot=True)
            results.append(console.command('bash /opt/sonora/bootstrap/lab.sh ' + phase,
                                          f'{index:02d}-{phase}', timeout=1200 if phase in ('provision', 'reprovision') else 180,
                                          confirm=phase in ('network-static', 'network-dhcp')))
        status = 'infrastructure-only-passed'
    finally:
        console.cast.close()
        if console.pipe:
            if status == 'infrastructure-only-passed':
                console.pipe.write(b'systemctl poweroff\n')
                time.sleep(1)
            console.pipe.close()
        save(evidence / 'completed-phases.json', results)
        save(evidence / 'results.json', {'status': status, 'academicDelivery': 'pending-applications', 'phases': results})
        evidence_index(evidence, state, results, status)
        requested = False
        info = ''
        for _ in range(60):
            # VirtualBox pode liberar a sessão durante o desligamento; não mascarar a falha original.
            probe = subprocess.run([state['vbox'], 'showvminfo', state['uuid'], '--machinereadable'],
                                   capture_output=True, text=True, encoding='utf-8', errors='replace')
            info = probe.stdout
            if 'VMState="poweroff"' in info:
                break
            if 'VMState="running"' in info and not requested:
                subprocess.run([state['vbox'], 'controlvm', state['uuid'], 'acpipowerbutton'], capture_output=True)
                requested = True
            time.sleep(0.5)
        save(evidence / 'shutdown.json', {'poweredOff': 'VMState="poweroff"' in info})
        save(evidence / 'sha256.json', {p.name: digest(p) for p in evidence.iterdir() if p.is_file() and p.name != 'sha256.json'})
        with zipfile.ZipFile(evidence.with_suffix('.zip'), 'w', zipfile.ZIP_DEFLATED) as bundle:
            for path in sorted(evidence.iterdir()):
                if path.is_file():
                    bundle.write(path, path.name)
    print('Evidências preservadas em ' + str(evidence), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'run'])
    parser.add_argument('--directory', default='output/lab/linux-repro')
    parser.add_argument('--vbox', default=r'C:\Program Files\Oracle\VirtualBox\VBoxManage.exe')
    args = parser.parse_args()
    if os.name != 'nt':
        parser.error('Este controlador usa named pipe do Windows; scripts convidados são Bash Ubuntu.')
    folder = (ROOT / args.directory).resolve()
    if not folder.is_relative_to((ROOT / 'output/lab').resolve()):
        parser.error('Diretório deve ficar em output/lab/ deste clone.')
    if args.action == 'prepare':
        prepare(folder, Path(args.vbox))
    else:
        state = json.loads((folder / 'lab.local.json').read_text(encoding='utf-8'))
        info = execute(state['vbox'], 'showvminfo', state['uuid'], '--machinereadable')
        if f'name="{state["name"]}"' not in info or f'UUID="{state["uuid"]}"' not in info:
            raise ValueError('Identidade da VM não confere com o laboratório.')
        run(folder, state)


if __name__ == '__main__':
    main()
