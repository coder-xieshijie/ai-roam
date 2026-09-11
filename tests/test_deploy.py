import importlib.util
import io
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
