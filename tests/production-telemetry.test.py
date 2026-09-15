import importlib.util
import os
import pathlib
import tempfile
import unittest
import contextlib
import io
import json
from unittest import mock

spec = importlib.util.spec_from_file_location('observer', pathlib.Path(__file__).resolve().parents[1] / 'ops/production-telemetry.py')
observer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observer)


def request(status=200, path='/contact.html'):
    return '127.0.0.1 - - [15/Sep/2026:18:00:00 +0800] "GET {} HTTP/1.1" {} 42 "-" "test"'.format(path, status)


class TelemetryTests(unittest.TestCase):
    def summary(self, lines=None, nginx=None, php=None):
        return observer.summarize([request()] if lines is None else lines, nginx or [], php or [], {'/contact.html'})

    def test_healthy(self):
        self.assertEqual(self.summary()['result'], 'PASS')

    def test_5xx_blocks(self):
        self.assertEqual(self.summary([request(502)])['result'], 'FAIL')

    def test_known404_blocks(self):
        self.assertEqual(self.summary([request(404)])['result'], 'FAIL')

    def test_encoded_known404_blocks(self):
        self.assertEqual(self.summary([request(404, '/%63ontact.html')])['result'], 'FAIL')

    def test_scan404_is_counted_not_failure(self):
        data = self.summary([request(), request(404, '/wp-config.php')])
        self.assertEqual(data['result'], 'PASS')
        self.assertEqual(data['accessStatusCounts']['404'], 1)

    def test_php_new_diagnostic_blocks(self):
        self.assertEqual(self.summary(php=['sensitive diagnostic'])['result'], 'FAIL')

    def test_missing_php_probe_not_fatal(self):
        line = '2026/09/15 18:00:00 [error] 1#1: open() "/site/wp-login.php" failed (2: No such file or directory), client: PRIVATE'
        self.assertEqual(self.summary(nginx=[line])['result'], 'PASS')

    def test_upstream_missing_file_not_hidden(self):
        line = '2026/09/15 18:00:00 [error] upstream open() failed (2: No such file or directory)'
        self.assertEqual(self.summary(nginx=[line])['result'], 'FAIL')

    def test_unclassified_error_blocks(self):
        self.assertEqual(self.summary(nginx=['2026/09/15 18:00:00 [crit] unexpected'])['result'], 'FAIL')

    def test_no_access_is_unknown(self):
        self.assertEqual(self.summary([])['result'], 'UNKNOWN')

    def test_malformed_access_is_unknown(self):
        self.assertEqual(self.summary(['malformed'])['result'], 'UNKNOWN')

    def test_malformed_nginx_is_unknown(self):
        self.assertEqual(self.summary(nginx=['continuation'])['result'], 'UNKNOWN')

    def test_no_raw_data_in_result(self):
        data = self.summary([request(500, '/?secret=PRIVATE')], ['2026/09/15 18:00:00 [error] PRIVATE'], ['PRIVATE'])
        self.assertNotIn('PRIVATE', str(data))

    def test_inquiry_status_not_delivery_claim(self):
        data = self.summary([request(200, '/send_inquiry.php')])
        self.assertEqual(data['inquiryStatusCounts'], {'200': 1})
        self.assertNotIn('delivery', str(data).lower())

    def test_log_delta_and_mutation(self):
        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, 'access.log')
            pathlib.Path(path).write_bytes(b'old\n')
            saved = observer.checkpoint(path)
            with open(path, 'ab') as h:
                h.write(b'new\n')
            self.assertEqual(observer.delta(path, saved), ['new'])
            pathlib.Path(path).write_bytes(b'xxxxnew\n')
            with self.assertRaises(ValueError):
                observer.delta(path, saved)

    def test_rotation_truncation_missing_and_partial(self):
        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, 'log')
            pathlib.Path(path).write_bytes(b'old\n')
            saved = observer.checkpoint(path)
            os.rename(path, path + '.1')
            pathlib.Path(path).write_bytes(b'old\n')
            with self.assertRaises(ValueError):
                observer.delta(path, saved)
            saved = observer.checkpoint(path)
            pathlib.Path(path).write_bytes(b'')
            with self.assertRaises(ValueError):
                observer.delta(path, saved)
            os.unlink(path)
            with self.assertRaises(OSError):
                observer.checkpoint(path)
            pathlib.Path(path).write_bytes(b'unfinished')
            with self.assertRaises(ValueError):
                observer.checkpoint(path)

    def test_oversized_delta_is_unknown_not_truncated(self):
        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, 'log')
            pathlib.Path(path).write_bytes(b'')
            saved = observer.checkpoint(path)
            pathlib.Path(path).write_bytes(b'x\n')
            with mock.patch.object(observer, 'LIMIT', 1):
                with self.assertRaises(ValueError):
                    observer.delta(path, saved)

    def test_path_traversal_rejected(self):
        for value in ['../escape', '/absolute', 'abc/def', 'short', 'x;echo bad']:
            with self.assertRaises(ValueError):
                observer.safe_transaction(value)

    @unittest.skipUnless(os.name == 'posix', 'POSIX root-owned transaction fixture runs in Linux CI')
    def test_transaction_lifecycle_and_replay(self):
        # Only ownership and fixed infrastructure paths are virtualized; actual
        # descriptors, exclusive creation, offsets and JSON are exercised.
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            logs = {key: str(root / key) for key in observer.LOGS}
            for path in logs.values():
                pathlib.Path(path).write_bytes(b'')
            transaction = 'release-test'
            real_fstat = os.fstat
            def owned_fstat(fd):
                values = list(real_fstat(fd))
                values[4] = 0
                return os.stat_result(values)
            with mock.patch.object(observer, 'LOGS', logs), \
                 mock.patch.object(observer, 'safe_transaction', return_value=folder), \
                 mock.patch.object(observer, 'public_inventory', return_value={'/contact.html'}), \
                 mock.patch.object(observer.os, 'geteuid', return_value=0), \
                 mock.patch.object(observer.os, 'fstat', side_effect=owned_fstat), \
                 mock.patch.object(observer.os.path, 'realpath', return_value='/www/begapunk/releases/' + transaction), \
                 contextlib.redirect_stdout(io.StringIO()) as output:
                self.assertEqual(observer.main(['observer', 'start', transaction]), 0)
                with self.assertRaises(FileExistsError):
                    observer.main(['observer', 'start', transaction])
                self.assertEqual(observer.main(['observer', 'check', transaction]), 1)
                pathlib.Path(logs['access']).write_text(request() + '\n')
                self.assertEqual(observer.main(['observer', 'check', transaction]), 0)
                snapshot = root / 'telemetry-start.json'
                saved = json.loads(snapshot.read_text())
                saved['startedAt'] -= 3601
                snapshot.write_text(json.dumps(saved))
                with self.assertRaises(ValueError):
                    observer.main(['observer', 'check', transaction])
                saved['startedAt'] += 3601
                saved['transaction'] = 'different-release'
                snapshot.write_text(json.dumps(saved))
                with self.assertRaises(ValueError):
                    observer.main(['observer', 'check', transaction])
            self.assertIn('"result": "PASS"', output.getvalue())

    @unittest.skipUnless(hasattr(os, 'O_NOFOLLOW'), 'requires POSIX no-follow flag')
    def test_symlink_log_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            original = pathlib.Path(folder) / 'original'
            original.write_bytes(b'log\n')
            link = pathlib.Path(folder) / 'link'
            link.symlink_to(original)
            with self.assertRaises(OSError):
                observer.checkpoint(str(link))


if __name__ == '__main__':
    unittest.main()
