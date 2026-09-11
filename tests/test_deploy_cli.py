"""Exercise the installed CLI without a local profile or cloud API calls."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch


@unittest.skipUnless(shutil.which('aliyun'), 'Alibaba Cloud CLI is not installed')
class DeployCliTests(unittest.TestCase):
    def test_temporary_credentials_work_without_a_configured_region(self):
        spec = importlib.util.spec_from_file_location(
            'deployer', Path(__file__).resolve().parents[1] / 'scripts/deploy-aliyun.py')
        deployer = importlib.util.module_from_spec(spec)
        with patch.dict(os.environ, {'ALIYUN_INSTANCE_ID': 'test-instance', 'ALIYUN_REGION': 'cn-shanghai'}):
            spec.loader.exec_module(deployer)
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp) / 'config.json'
            config.write_text(json.dumps({'current': 'default', 'profiles': [
                {'name': 'default', 'mode': 'StsToken'}]}))
            env = {key: value for key, value in os.environ.items()
                   if not key.startswith(('ALIBABA', 'ALICLOUD', 'ALIYUN'))}
            env.update(ALIBABA_CLOUD_ACCESS_KEY_ID='test-only-key',
                       ALIBABA_CLOUD_ACCESS_KEY_SECRET='test-only-secret',
                       ALIBABA_CLOUD_SECURITY_TOKEN='test-only-token')
            run = subprocess.run

            def validate_with_real_cli(args, **kwargs):
                # Legacy --dryrun validates credentials/region and signs the
                # request, but never sends it. --cli-dry-run skips validation.
                result = run(args + ['--config-path', str(config), '--dryrun'],
                             env=env, capture_output=True, text=True, timeout=20)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn('ecs.cn-shanghai.aliyuncs.com', result.stdout)
                self.assertIn('RegionId=cn-shanghai', result.stdout)
                return subprocess.CompletedProcess(args, 0, stdout='{}')

            with patch.object(deployer.subprocess, 'run', side_effect=validate_with_real_cli):
                deployer.api('DescribeInvocationResults', InstanceId='test-instance')


if __name__ == '__main__':
    unittest.main()
