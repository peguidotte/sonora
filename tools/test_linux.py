"""Executa Bash com amostras controladas; testes da VM real ficam em linux/verify.sh."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(sys.platform.startswith('linux'), 'Requer ferramentas Linux; executado no CI Ubuntu.')
class LinuxScriptsTests(unittest.TestCase):
    def render_network(self, config):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'network.json'
            path.write_text(json.dumps(config), encoding='utf-8')
            return subprocess.run(['bash', str(ROOT / 'linux/network.sh'), 'render', str(path)],
                                  capture_output=True, text=True, timeout=5)

    def test_dhcp_has_no_static_address_or_gateway(self):
        result = self.render_network({'interface': 'eth0', 'mode': 'dhcp', 'dns': ['168.63.129.16']})
        self.assertEqual(result.returncode, 0, result.stderr)
        nic = json.loads(result.stdout)['network']['ethernets']['eth0']
        self.assertTrue(nic['dhcp4'])
        self.assertNotIn('addresses', nic)
        self.assertNotIn('routes', nic)

    def test_static_address_prefix_route_and_dns(self):
        result = self.render_network({'interface': 'ens33', 'mode': 'static', 'address': '192.168.50.20/24',
                                      'gateway': '192.168.50.1', 'dns': ['1.1.1.1']})
        self.assertEqual(result.returncode, 0, result.stderr)
        nic = json.loads(result.stdout)['network']['ethernets']['ens33']
        self.assertFalse(nic['dhcp4'])
        self.assertEqual(nic['addresses'], ['192.168.50.20/24'])
        self.assertEqual(nic['routes'], [{'to': 'default', 'via': '192.168.50.1'}])

    def test_reject_network_config_injection_and_invalid_routes(self):
        valid = {'interface': 'eth0', 'mode': 'static', 'address': '192.168.50.20/24',
                 'gateway': '192.168.50.1', 'dns': ['1.1.1.1']}
        for change in ({'interface': 'eth0;echo unsafe'}, {'gateway': '10.0.0.1'},
                       {'gateway': '192.168.50.20'}, {'address': 'not-an-ip'},
                       {'dns': ['1.1.1.1\nunsafe']}, {'dns': []}, {'script': 'unsafe'}, {'mode': 'dhcp'}):
            with self.subTest(change=change):
                result = self.render_network(valid | change)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(result.stdout, '')

    def run_monitor(self, overrides=None, missing_available=False):
        with tempfile.TemporaryDirectory() as folder:
            base = Path(folder)
            (base / 'proc').mkdir()
            (base / 'bin').mkdir()
            (base / 'proc/stat').write_text('cpu 0 0 0 100 0 0 0 0 50 0\n')
            helper = base / 'bin/sleep'
            helper.write_text('''#!/usr/bin/env python3
import os
from pathlib import Path
p=Path(os.environ['PROC_ROOT'])
state=p/'counter'
n=int(state.read_text())+1 if state.exists() else 1
state.write_text(str(n))
(p/'stat').write_text('cpu 80 0 0 120 0 0 0 0 50 0\\n' if n==1 else 'cpu 90 0 0 210 0 0 0 0 50 0\\n')
available=10 if n==1 else 90
(p/'meminfo').write_text('MemTotal: 100 kB\\n'+('' if os.environ.get('MISSING_AVAILABLE') else f'MemAvailable: {available} kB\\n'))
''')
            helper.chmod(0o755)
            df = base / 'bin/df'
            df.write_text('''#!/usr/bin/env python3
import os
from pathlib import Path
n=int((Path(os.environ['PROC_ROOT'])/'counter').read_text())
print('Filesystem 1024-blocks Used Available Capacity Mounted on')
print('fixture 100 90 10 '+('90%' if n==1 else '10%')+' /fixture')
''')
            df.chmod(0o755)
            env = os.environ | {'PATH': str(base / 'bin') + os.pathsep + os.environ['PATH'],
                               'PROC_ROOT': str(base / 'proc'), 'DISK_PATH': str(base), 'SAMPLE_COUNT': '2',
                               'INTERVAL_SECONDS': '1', 'CPU_THRESHOLD': '70', 'MEMORY_THRESHOLD': '70',
                               'DISK_THRESHOLD': '70'}
            if missing_available:
                env['MISSING_AVAILABLE'] = '1'
            env.update(overrides or {})
            return subprocess.run(['bash', str(ROOT / 'linux/monitor.sh')], env=env,
                                  capture_output=True, text=True, timeout=5)

    def test_formula_and_each_resource_alert_then_recovery(self):
        result = self.run_monitor()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('sample cpu=80 memory=90 disk=90 state=alert', result.stdout)
        self.assertIn('sample cpu=10 memory=10 disk=10 state=normal', result.stdout)
        for resource in ('cpu', 'memory', 'disk'):
            self.assertIn('alert resource=' + resource, result.stdout)
            self.assertIn('recovery resource=' + resource, result.stdout)
        self.assertEqual(result.stdout.count('sample cpu='), 2)

    def test_invalid_limits_fail_before_monitoring(self):
        for override in ({'CPU_THRESHOLD': '101'}, {'MEMORY_THRESHOLD': '0'}, {'DISK_THRESHOLD': '08'},
                         {'INTERVAL_SECONDS': '0'}, {'SAMPLE_COUNT': '-1'}):
            with self.subTest(override=override):
                result = self.run_monitor(override)
                self.assertEqual(result.returncode, 2)
                self.assertNotIn('sample cpu=', result.stdout)

    def test_unavailable_memory_is_error_not_zero_usage(self):
        result = self.run_monitor(missing_available=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('sample cpu=', result.stdout)


if __name__ == '__main__':
    unittest.main()
