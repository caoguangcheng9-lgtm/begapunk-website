#!/usr/bin/python3
"""Fixed-path, root-owned deployment observer. Python 3.6+; no third parties.

No raw requests, client addresses, headers or PHP messages leave this process.
Rotation/truncation, missing data and parser failures are UNKNOWN, never PASS.
"""
import collections
import hashlib
import json
import os
import re
import stat
import sys
import time
from urllib.parse import unquote, urlsplit

ROOT = '/www/begapunk/shared/nginx-transactions'
CURRENT = '/www/begapunk/current'
LOGS = {
    'access': '/www/wwwlogs/47.252.73.192.log',
    'nginx': '/www/wwwlogs/47.252.73.192.error.log',
    'php': '/www/server/php/82/var/log/php-fpm.log',
}
LIMIT = 16 * 1024 * 1024
ACCESS = re.compile(r'^[^ ]+ [^ ]+ [^ ]+ \[[^\]]+\] "([^"\r\n]*)" (\d{3}) (?:\d+|-) ')
ERROR = re.compile(r'^\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2} \[(\w+)\]')


def regular_open(path):
    fd = os.open(path, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    if not stat.S_ISREG(os.fstat(fd).st_mode):
        os.close(fd)
        raise ValueError('not a regular file')
    return os.fdopen(fd, 'rb')


def checkpoint(path):
    with regular_open(path) as handle:
        info = os.fstat(handle.fileno())
        size = info.st_size
        handle.seek(max(0, size - 256))
        edge = handle.read(size - max(0, size - 256))
        if size and not edge.endswith(b'\n'):
            raise ValueError('incomplete log boundary')
        return {'device': info.st_dev, 'inode': info.st_ino, 'offset': size,
                'edge': hashlib.sha256(edge).hexdigest()}


def delta(path, saved):
    with regular_open(path) as handle:
        info = os.fstat(handle.fileno())
        offset = saved['offset']
        if (info.st_dev, info.st_ino) != (saved['device'], saved['inode']):
            raise ValueError('log rotated')
        if info.st_size < offset or info.st_size - offset > LIMIT:
            raise ValueError('log truncated or observation exceeds limit')
        handle.seek(max(0, offset - 256))
        if hashlib.sha256(handle.read(offset - max(0, offset - 256))).hexdigest() != saved['edge']:
            raise ValueError('log checkpoint replaced')
        handle.seek(offset)
        data = handle.read(info.st_size - offset)
        if data and not data.endswith(b'\n'):
            raise ValueError('incomplete observation boundary')
        return data.decode('utf-8', errors='strict').splitlines()


def summarize(access, nginx, php, public_paths):
    counts = collections.Counter()
    inquiry = collections.Counter()
    errors = collections.Counter()
    bad = 0
    known404 = 0
    for line in access:
        match = ACCESS.match(line)
        if not match:
            bad += 1
            continue
        request, status = match.groups()
        counts[status] += 1
        parts = request.split()
        path = unquote(urlsplit(parts[1]).path) if len(parts) == 3 else ''
        if path == '/send_inquiry.php':
            inquiry[status] += 1
        if status == '404' and path in public_paths:
            known404 += 1
    fatal = 0
    for line in nginx:
        match = ERROR.match(line)
        if not match:
            bad += 1
            continue
        severity = match.group(1).lower()
        # Missing-file scans are noise only when the message is an open() error;
        # PHP/upstream failures must never be hidden by the same words.
        missing = 'open() ' in line and '(2: No such file or directory)' in line
        if missing and severity == 'error' and 'upstream' not in line.lower() and 'fastcgi sent' not in line.lower():
            errors['missingFile'] += 1
        elif severity in ('info', 'notice', 'debug'):
            errors[severity] += 1
        else:
            errors['blockingOrUnclassified'] += 1
            fatal += 1
    # Any new PHP-FPM diagnostic needs review; do not print its contents.
    php_count = len(php)
    five_xx = sum(v for k, v in counts.items() if k.startswith('5'))
    result = 'UNKNOWN' if bad or not counts else 'FAIL' if five_xx or fatal or php_count or known404 else 'PASS'
    return {'result': result, 'accessStatusCounts': dict(counts),
            'inquiryStatusCounts': dict(inquiry), 'nginxCategories': dict(errors),
            'phpNewLines': php_count, 'parserFailures': bad, 'knownPublic404': known404,
            'fiveXX': five_xx, 'requests': sum(counts.values())}


def safe_transaction(transaction):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{5,100}', transaction):
        raise ValueError('invalid transaction')
    directory = ROOT + '/' + transaction
    for target in (ROOT, directory):
        info = os.lstat(target)
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o700:
            raise ValueError('unsafe transaction metadata')
    with regular_open(directory + '/backup-ready'):
        pass
    if os.path.lexists(directory + '/committed'):
        raise ValueError('transaction already committed')
    return directory


def public_inventory():
    # The active immutable release manifest is already verified by activation.
    # Exclude intentionally denied internals and approved compatibility probes.
    paths = set(['/'])
    with regular_open(CURRENT + '/manifest.sha256') as handle:
        for raw in handle:
            line = raw.decode('utf-8').rstrip('\n')
            match = re.fullmatch(r'[0-9a-f]{64}  (.+)', line)
            if not match:
                raise ValueError('invalid active manifest')
            name = match[1]
            if name.startswith(('PHPMailer/', '.')) or '..' in name.split('/'):
                continue
            if name.endswith(('.html', '.css', '.js', '.webp', '.png', '.jpg', '.svg', '.woff2', '.pdf', '.step')):
                paths.add('/' + name)
    return paths


def main(argv):
    if len(argv) != 3 or argv[1] not in ('start', 'check') or os.geteuid() != 0:
        raise ValueError('invalid invocation')
    action, transaction = argv[1:]
    directory = safe_transaction(transaction)
    snapshot = directory + '/telemetry-start.json'
    if action == 'start':
        data = {'version': 1, 'transaction': transaction, 'startedAt': time.time(),
                'logs': {name: checkpoint(path) for name, path in LOGS.items()}}
        fd = os.open(snapshot, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, 'w') as handle:
            json.dump(data, handle)
        print(json.dumps({'result': 'PASS', 'stage': 'checkpoint', 'transaction': transaction}))
        return 0
    if os.path.realpath(CURRENT) != '/www/begapunk/releases/' + transaction:
        raise ValueError('active release mismatch')
    with regular_open(snapshot) as handle:
        info = os.fstat(handle.fileno())
        if info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o600 or info.st_size > 8192:
            raise ValueError('unsafe checkpoint metadata')
        saved = json.load(handle)
    age = time.time() - saved['startedAt']
    if saved['version'] != 1 or saved['transaction'] != transaction or not 0 <= age <= 3600:
        raise ValueError('stale or mismatched checkpoint')
    data = {name: delta(path, saved['logs'][name]) for name, path in LOGS.items()}
    result = summarize(data['access'], data['nginx'], data['php'], public_inventory())
    result.update({'schemaVersion': 1, 'controlId': 'OBS-01', 'transaction': transaction,
                   'startedAtEpoch': saved['startedAt'], 'checkedAtEpoch': time.time(),
                   'containsPersonalData': False, 'scope': 'post-checkpoint-log-delta'})
    print(json.dumps(result, sort_keys=True))
    return 0 if result['result'] == 'PASS' else 1


if __name__ == '__main__':
    try:
        sys.exit(main(sys.argv))
    except Exception:
        # Exceptions can contain a request or local secret path. Emit no raw data.
        print(json.dumps({'result': 'UNKNOWN', 'controlId': 'OBS-01',
                          'reason': 'telemetry unavailable, unsafe, stale or unparsable'}))
        sys.exit(2)
