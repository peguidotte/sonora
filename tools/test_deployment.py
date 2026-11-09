"""Fronteiras de segurança de artefatos; sem provisionar nuvem ou executar apps."""
import importlib.util
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sonora_release', ROOT / 'linux/deploy-release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
pipeline_spec = importlib.util.spec_from_file_location('sonora_pipeline', ROOT / 'deploy/pipeline.py')
pipeline = importlib.util.module_from_spec(pipeline_spec)
pipeline_spec.loader.exec_module(pipeline)
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


class ReleaseIdentityTests(unittest.TestCase):
    def test_github_identity(self):
        with patch.dict(os.environ, {'GITHUB_SHA': 'a' * 40, 'GITHUB_RUN_ID': '123', 'GITHUB_RUN_ATTEMPT': '2'}, clear=True):
            self.assertEqual(pipeline.release_id(), 'a' * 40 + '-123-2')

    def test_azure_devops_identity(self):
        with patch.dict(os.environ, {'BUILD_SOURCEVERSION': 'b' * 40, 'BUILD_BUILDID': '456', 'SYSTEM_JOBATTEMPT': '3'}, clear=True):
            self.assertEqual(pipeline.release_id(), 'b' * 40 + '-456-3')

    def test_explicit_identity_without_provider(self):
        with patch.dict(os.environ, {'SONORA_SOURCE_COMMIT': 'c' * 40, 'SONORA_RUN_ID': '789', 'SONORA_RUN_ATTEMPT': '1'}, clear=True):
            self.assertEqual(pipeline.release_id(), 'c' * 40 + '-789-1')

    def test_shell_payload_in_identity_is_rejected(self):
        with patch.dict(os.environ, {'GITHUB_SHA': 'a' * 40, 'GITHUB_RUN_ID': '123;whoami'}, clear=True):
            with self.assertRaises(ValueError):
                pipeline.release_id()


if __name__ == '__main__':
    unittest.main()
