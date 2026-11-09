"""Fronteiras de segurança de artefatos; sem provisionar nuvem ou executar apps."""
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sonora_release', ROOT / 'linux/deploy-release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
RELEASE = 'a' * 40 + '-123-1'


class ArtifactSecurityTests(unittest.TestCase):
    def archive(self, root, entries):
        path = root / 'bundle.tar.gz'
        with tarfile.open(path, 'w:gz') as bundle:
            for name, kind, content in entries:
                info = tarfile.TarInfo(name)
                info.type = kind
                if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE):
                    info.linkname = '../../outside'
                    bundle.addfile(info)
                else:
                    data = content.encode()
                    info.size = len(data)
                    bundle.addfile(info, io.BytesIO(data))
        return path

    def reject(self, entries):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / 'unpack'
            output.mkdir()
            with self.assertRaises(ValueError):
                release.extract_release(self.archive(root, entries), output)
            self.assertEqual(list(output.iterdir()), [])

    def test_parent_traversal_rejected_before_extraction(self):
        self.reject([('safe', tarfile.REGTYPE, 'ok'), ('../outside', tarfile.REGTYPE, 'bad')])

    def test_absolute_path_rejected(self):
        self.reject([('/etc/cron.d/payload', tarfile.REGTYPE, 'bad')])

    def test_windows_drive_path_rejected(self):
        self.reject([('C:/Windows/payload', tarfile.REGTYPE, 'bad')])

    def test_symlink_rejected(self):
        self.reject([('link', tarfile.SYMTYPE, '')])

    def test_hardlink_rejected(self):
        self.reject([('link', tarfile.LNKTYPE, '')])

    def test_duplicate_member_rejected(self):
        self.reject([('start.sh', tarfile.REGTYPE, 'one'), ('start.sh', tarfile.REGTYPE, 'two')])

    def test_manifest_prevents_component_substitution(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'release.json').write_text(json.dumps({'component': 'soa', 'releaseId': RELEASE, 'commit': RELEASE[:40]}))
            with self.assertRaises(ValueError):
                release.validate_manifest(root, 'api', RELEASE)

    def test_valid_release_extracted_and_verified(self):
        manifest = json.dumps({'component': 'api', 'releaseId': RELEASE, 'commit': RELEASE[:40]})
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / 'unpack'
            output.mkdir()
            archive = self.archive(root, [('release.json', tarfile.REGTYPE, manifest),
                                          ('bin/start.sh', tarfile.REGTYPE, '#!/bin/bash\nexit 0\n')])
            release.extract_release(archive, output)
            release.validate_manifest(output, 'api', RELEASE)
            self.assertTrue((output / 'bin/start.sh').is_file())


if __name__ == '__main__':
    unittest.main()
