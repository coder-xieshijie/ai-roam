"""Install only the validated public files; compatible with ECS Python 3.6."""
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request


def unpack(archive, manifest, destination):
    allowed = {'.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.ico', '.svg', '.webp', '.woff2', '.txt'}
    for name, digest in manifest.items():
        path = PurePosixPath(name)
        if (path.is_absolute() or '..' in path.parts or not path.parts
                or any(part.startswith('.') for part in path.parts)
                or path.suffix not in allowed or not re.fullmatch('[a-f0-9]{64}', digest)):
            raise ValueError('Invalid public file: ' + name)
    found = set()
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as bundle:
        for member in bundle:
            name = '/'.join(PurePosixPath(member.name).parts[1:])
            if name not in manifest:
                continue
            if not member.isfile() or name in found or member.size > 20 * 1024 * 1024:
                raise ValueError('Invalid archive member: ' + name)
            body = bundle.extractfile(member).read()
            if hashlib.sha256(body).hexdigest() != manifest[name]:
                raise ValueError('Content mismatch: ' + name)
            target = destination / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(body)
            target.chmod(0o644)
            found.add(name)
    if found != set(manifest) or 'index.html' not in found or 'assets/favicon.ico' not in found:
        raise ValueError('Missing required public files')


def switch(root, target):
    temporary = root / 'current.next'
    if temporary.is_symlink():
        temporary.unlink()
    temporary.symlink_to(target)
    os.replace(str(temporary), str(root / 'current'))


def activate(root, release, verify):
    previous = (root / 'current').resolve(strict=True)
    switch(root, release)
    try:
        verify()
    except BaseException:
        switch(root, previous)
        raise
    return previous


def download(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=90) as response:
                data = response.read(50 * 1024 * 1024 + 1)
            if len(data) > 50 * 1024 * 1024:
                raise ValueError('Archive is too large')
            return data
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(5)


def main(payload):
    sha = payload['sha']
    if not re.fullmatch('[a-f0-9]{40}', sha):
        raise ValueError('Expected full Git commit SHA')
    root = Path('/var/www/ai-roam')
    os.umask(0o022)
    with (root / '.deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        archive = download('https://codeload.github.com/coder-xieshijie/ai-roam/tar.gz/' + sha)
        if hashlib.sha256(archive).hexdigest() != payload['archive_sha256']:
            raise ValueError('Archive checksum mismatch')
        stage = Path(tempfile.mkdtemp(prefix=sha + '-', dir=str(root / 'releases')))
        stage.chmod(0o755)
        try:
            unpack(archive, payload['manifest'], stage)
            (stage / 'deploy-version.txt').write_text(sha + '\n')
            def verify():
                for name in ('index.html', 'assets/favicon.ico', 'deploy-version.txt'):
                    body = subprocess.check_output([
                        'curl', '-fsS', '--max-time', '20', '--resolve',
                        'xieshijie.cn:443:127.0.0.1', 'https://xieshijie.cn/' + name])
                    if body != (stage / name).read_bytes():
                        raise ValueError('Local HTTPS check failed: ' + name)
            previous = activate(root, stage, verify)
            print(json.dumps({'deployed': sha, 'previous': str(previous), 'files': len(payload['manifest'])}))
        except BaseException:
            if (root / 'current').resolve() != stage:
                shutil.rmtree(str(stage))
            raise


if __name__ == '__main__':
    main(json.loads(sys.argv[1]))
