import importlib.util
import io
import base64
import json
import os
import subprocess
from unittest.mock import patch
import hashlib
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('receiver', Path(__file__).resolve().parents[1] / 'scripts/deploy-receive.py')
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)


def bundle(files):
    data = io.BytesIO()
    with tarfile.open(fileobj=data, mode='w:gz') as tar:
        for name, body in files.items():
            info = tarfile.TarInfo('ai-roam-sha/' + name)
            info.size = len(body)
            tar.addfile(info, io.BytesIO(body))
    return data.getvalue()


class DeployTests(unittest.TestCase):
    def test_compact_command_preserves_payload_and_receiver_execution(self):
        path = Path(__file__).resolve().parents[1] / 'scripts/deploy-aliyun.py'
        spec = importlib.util.spec_from_file_location('deployer', path)
        deployer = importlib.util.module_from_spec(spec)
        with patch.dict(os.environ, {'ALIYUN_INSTANCE_ID': 'test-instance'}):
            spec.loader.exec_module(deployer)
        payload = {'sha': 'a' * 40, 'archive_sha256': 'b' * 64, 'manifest': {
            'assets/articles/' + str(i) + '.webp': hashlib.sha256(str(i).encode()).hexdigest()
            for i in range(220)}}
        # Real receiver size must fit the service's encoded command limit.
        self.assertLess(len(deployer.deployment_command(payload)), 24 * 1024)
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'scripts').mkdir()
            (root / 'scripts/deploy-receive.py').write_text(
                'import json, sys\nif __name__ == "__main__":\n    print(json.dumps(json.loads(sys.argv[1])))\n')
            with patch.object(deployer, 'ROOT', root):
                encoded = deployer.deployment_command(payload)
            result = subprocess.run(['bash'], input=base64.b64decode(encoded), capture_output=True, check=True)
            self.assertEqual(json.loads(result.stdout), payload)

    def test_only_verified_public_files_are_extracted(self):
        files = {'index.html': b'homepage', 'assets/favicon.ico': b'icon'}
        manifest = {name: hashlib.sha256(body).hexdigest() for name, body in files.items()}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            receiver.unpack(bundle(dict(files, **{'content/private.md': b'private'})), manifest, root)
            self.assertEqual((root / 'index.html').read_bytes(), b'homepage')
            self.assertFalse((root / 'content').exists())
            with self.assertRaises(ValueError):
                receiver.unpack(bundle({'index.html': b'tampered'}), manifest, root)
            with self.assertRaises(ValueError):
                receiver.unpack(bundle(files), {'../escape.html': 'a' * 64}, root)

    def test_webfonts_and_their_licenses_can_be_deployed(self):
        files = {'index.html': b'homepage', 'assets/favicon.ico': b'icon',
                 'assets/fonts/wenkai.woff2': b'wOF2',
                 'assets/fonts/WenKai-OFL.txt': b'SIL Open Font License'}
        manifest = {name: hashlib.sha256(body).hexdigest() for name, body in files.items()}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            receiver.unpack(bundle(files), manifest, root)
            for name, body in files.items():
                self.assertEqual((root / name).read_bytes(), body)

    def test_symlink_in_archive_is_rejected(self):
        data = io.BytesIO()
        with tarfile.open(fileobj=data, mode='w:gz') as tar:
            info = tarfile.TarInfo('repo/index.html')
            info.type = tarfile.SYMTYPE
            info.linkname = '/etc/passwd'
            tar.addfile(info)
        with tempfile.TemporaryDirectory() as tmp, self.assertRaises(ValueError):
            receiver.unpack(data.getvalue(), {'index.html': 'a' * 64}, Path(tmp))

    def test_failed_health_check_restores_previous_release(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            old, new = root / 'old', root / 'new'
            old.mkdir()
            new.mkdir()
            (root / 'current').symlink_to(old)
            def fail():
                self.assertEqual((root / 'current').resolve(), new)
                raise RuntimeError('HTTPS check failed')
            with self.assertRaises(RuntimeError):
                receiver.activate(root, new, fail)
            self.assertEqual((root / 'current').resolve(), old)
            receiver.activate(root, new, lambda: None)
            self.assertEqual((root / 'current').resolve(), new)


if __name__ == '__main__':
    unittest.main()
