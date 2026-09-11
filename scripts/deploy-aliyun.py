"""Dispatch a verified commit using the CLI's existing temporary credentials."""
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import time
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parent.parent
REGION = os.environ.get('ALIYUN_REGION', 'cn-shanghai')
INSTANCE = os.environ['ALIYUN_INSTANCE_ID']


def api(action, **parameters):
    args = ['aliyun', 'ecs', action, '--RegionId', REGION]
    for key, value in parameters.items():
        args.extend(['--' + key, str(value)])
    result = subprocess.run(args, check=True, stdout=subprocess.PIPE, text=True)
    return json.loads(result.stdout)


def fetch(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=90) as response:
                return response.read()
        except OSError:
            if attempt == 2:
                raise
            time.sleep(5)


def main():
    sha = os.environ.get('GITHUB_SHA') or subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    if not re.fullmatch('[a-f0-9]{40}', sha):
        raise ValueError('Expected full Git commit SHA')
    manifest = {}
    for path in sorted((ROOT / 'dist').rglob('*')):
        if not path.is_file():
            continue
        name = path.relative_to(ROOT / 'dist').as_posix()
        if name == '.nojekyll':
            continue
        # Only committed public output may be sent to production.
        committed = subprocess.check_output(['git', 'show', sha + ':' + name], cwd=ROOT)
        if path.read_bytes() != committed:
            raise ValueError('Build output was not committed: ' + name)
        manifest[name] = hashlib.sha256(committed).hexdigest()
    archive = fetch('https://codeload.github.com/coder-xieshijie/ai-roam/tar.gz/' + sha)
    payload = json.dumps({'sha': sha, 'manifest': manifest, 'archive_sha256': hashlib.sha256(archive).hexdigest()})
    receiver = (ROOT / 'scripts/deploy-receive.py').read_text()
    command = "#!/bin/bash\nset -euo pipefail\npython3 - " + shlex.quote(payload) + " <<'AI_ROAM_PYTHON'\n" + receiver + '\nAI_ROAM_PYTHON\n'
    encoded = base64.b64encode(command.encode()).decode()
    if len(encoded) > 24 * 1024:
        raise ValueError('Cloud Assistant command exceeds 24 KiB')
    invocation = api('RunCommand', **{
        'InstanceId.1': INSTANCE, 'Type': 'RunShellScript', 'Username': 'ai-roam-deploy',
        'WorkingDir': '/var/www/ai-roam', 'ContentEncoding': 'Base64',
        'CommandContent': encoded, 'Timeout': 600, 'KeepCommand': 'false',
        'ClientToken': str(uuid.uuid4()), 'Name': 'ai-roam-' + sha[:12]})
    invoke_id = invocation['InvokeId']
    print('Cloud Assistant invocation:', invoke_id, flush=True)
    deadline = time.monotonic() + 660
    while time.monotonic() < deadline:
        time.sleep(10)
        result = api('DescribeInvocationResults', InvokeId=invoke_id, InstanceId=INSTANCE, ContentEncoding='PlainText')
        items = result.get('Invocation', {}).get('InvocationResults', {}).get('InvocationResult', [])
        if not items or items[0]['InvocationStatus'] in ('Pending', 'Scheduled', 'Running'):
            continue
        item = items[0]
        print(item.get('Output', ''), flush=True)
        if item['InvocationStatus'] != 'Success' or item.get('ExitCode') != 0:
            raise RuntimeError('Deployment failed: ' + json.dumps(item))
        break
    else:
        raise TimeoutError('Deployment result timed out; inspect invocation ' + invoke_id)
    for name, digest in manifest.items():
        body = fetch('https://xieshijie.cn/' + name + '?deploy=' + sha)
        if hashlib.sha256(body).hexdigest() != digest:
            raise ValueError('Public HTTPS content mismatch: ' + name)
    if fetch('https://xieshijie.cn/deploy-version.txt').decode().strip() != sha:
        raise ValueError('Public deployment version mismatch')
    print('Verified public HTTPS release:', sha)


if __name__ == '__main__':
    main()
