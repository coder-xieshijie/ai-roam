#!/usr/bin/env python3
"""Count Markdown line changes locally and publish aggregate-only metrics."""

import base64
from difflib import SequenceMatcher
import hashlib
import hmac
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import time
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen
import uuid


VAULT_PATH = Path(
    os.environ.get("OBSIDIAN_LINE_METRICS_VAULT", "/Users/minimax/code/shijie-apple")
)
STATE_PATH = Path(
    os.environ.get(
        "OBSIDIAN_LINE_METRICS_STATE",
        "/Users/minimax/Library/Application Support/Obsidian Line Metrics/state.sqlite3",
    )
)
METRICS_URL = os.environ.get(
    "OBSIDIAN_LINE_METRICS_URL", "https://sync.xieshijie.cn/obsidian_metrics"
).rstrip("/")
CREDENTIAL_SERVICE = "com.openai.codex.obsidian-livesync.couchdb-user"
CREDENTIAL_ACCOUNT = "obsidian_sync"
HMAC_SERVICE = "com.openai.codex.obsidian-line-metrics.hmac"
HMAC_ACCOUNT = "vault"


def keychain_secret(service, account):
    return subprocess.check_output(
        [
            "/usr/bin/security",
            "find-generic-password",
            "-s",
            service,
            "-a",
            account,
            "-w",
        ],
        text=True,
    ).rstrip("\n")


def private_digest(key, namespace, value):
    message = namespace.encode("utf-8") + b"\0" + value
    return hmac.new(key, message, hashlib.sha256).hexdigest()


def scan_markdown(vault_path, key):
    files = {}
    for directory, child_directories, names in os.walk(str(vault_path)):
        child_directories[:] = sorted(
            name
            for name in child_directories
            if not name.startswith(".") and name != "node_modules"
        )
        for name in sorted(names):
            if name.startswith(".") or not name.lower().endswith(".md"):
                continue
            path = Path(directory) / name
            relative = path.relative_to(vault_path).as_posix().encode("utf-8")
            file_id = private_digest(key, "path", relative)
            text = path.read_bytes().decode("utf-8-sig", errors="replace")
            files[file_id] = [
                private_digest(key, "line", line.encode("utf-8"))
                for line in text.splitlines()
            ]
    return files


def diff_counts(before, after):
    added = 0
    deleted = 0
    matcher = SequenceMatcher(None, before, after, autojunk=False)
    for operation, old_start, old_end, new_start, new_end in matcher.get_opcodes():
        if operation in ("insert", "replace"):
            added += new_end - new_start
        if operation in ("delete", "replace"):
            deleted += old_end - old_start
    return added, deleted


def open_state(path=STATE_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    os.chmod(str(path.parent), 0o700)
    connection = sqlite3.connect(str(path), timeout=10)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=FULL")
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS file_state (
            file_id TEXT PRIMARY KEY,
            line_hashes TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS pending_events (
            event_id TEXT PRIMARY KEY,
            observed_at INTEGER NOT NULL,
            added_lines INTEGER NOT NULL,
            deleted_lines INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_pending_events_observed
            ON pending_events(observed_at);
        """
    )
    connection.execute("PRAGMA optimize")
    connection.commit()
    os.chmod(str(path), 0o600)
    return connection


def get_metadata(connection, key):
    row = connection.execute(
        "SELECT value FROM metadata WHERE key = ?", (key,)
    ).fetchone()
    return row[0] if row else None


def set_metadata(connection, key, value):
    connection.execute(
        "INSERT OR REPLACE INTO metadata(key, value) VALUES (?, ?)",
        (key, str(value)),
    )


def load_files(connection):
    return {
        row[0]: json.loads(row[1])
        for row in connection.execute(
            "SELECT file_id, line_hashes FROM file_state"
        ).fetchall()
    }


def record_scan(connection, current, now_epoch):
    previous = load_files(connection)
    started_at = get_metadata(connection, "tracking_started_at")
    baseline = started_at is None
    added = 0
    deleted = 0
    if baseline:
        started_at = now_epoch
    else:
        for file_id, current_lines in current.items():
            previous_lines = previous.get(file_id)
            if previous_lines is None:
                added += len(current_lines)
            else:
                file_added, file_deleted = diff_counts(
                    previous_lines, current_lines
                )
                added += file_added
                deleted += file_deleted
        for file_id, previous_lines in previous.items():
            if file_id not in current:
                deleted += len(previous_lines)
    with connection:
        connection.execute("DELETE FROM file_state")
        connection.executemany(
            """
            INSERT INTO file_state(file_id, line_hashes, updated_at)
            VALUES (?, ?, ?)
            """,
            [
                (
                    file_id,
                    json.dumps(line_hashes, separators=(",", ":")),
                    now_epoch,
                )
                for file_id, line_hashes in current.items()
            ],
        )
        set_metadata(connection, "tracking_started_at", started_at)
        set_metadata(connection, "last_scanned_at", now_epoch)
        if added or deleted:
            connection.execute(
                """
                INSERT INTO pending_events(
                    event_id, observed_at, added_lines, deleted_lines
                ) VALUES (?, ?, ?, ?)
                """,
                (
                    "line-event:{0:010d}:{1}".format(now_epoch, uuid.uuid4()),
                    now_epoch,
                    added,
                    deleted,
                ),
            )
    return {
        "baseline": baseline,
        "trackingSince": int(started_at),
        "lastScannedAt": now_epoch,
        "addedLines": added,
        "deletedLines": deleted,
    }


def request_json(document_id, username, password, method="GET", payload=None):
    token = base64.b64encode(
        (username + ":" + password).encode("utf-8")
    ).decode("ascii")
    body = None
    if payload is not None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    request = Request(
        METRICS_URL + "/" + quote(document_id, safe=""),
        data=body,
        method=method,
        headers={
            "Authorization": "Basic " + token,
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=15) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code in (404, 409):
            return error.code, None
        raise


def put_document(document, username, password):
    status, _response = request_json(
        document["_id"], username, password, method="PUT", payload=document
    )
    return status in (201, 202, 409)


def upload(connection, summary, username, password):
    pending = connection.execute(
        """
        SELECT event_id, observed_at, added_lines, deleted_lines
        FROM pending_events
        ORDER BY observed_at, event_id
        """
    ).fetchall()
    for event_id, observed_at, added, deleted in pending:
        document = {
            "_id": event_id,
            "type": "line-metric",
            "schemaVersion": 1,
            "observedAt": observed_at,
            "addedLines": added,
            "deletedLines": deleted,
        }
        if put_document(document, username, password):
            with connection:
                connection.execute(
                    "DELETE FROM pending_events WHERE event_id = ?", (event_id,)
                )
    state_id = "line-state:mac"
    state_status, remote_state = request_json(state_id, username, password)
    state = {
        "_id": state_id,
        "type": "line-metric-state",
        "schemaVersion": 1,
        "trackingSince": summary["trackingSince"],
        "lastScannedAt": summary["lastScannedAt"],
    }
    if state_status == 200 and remote_state and remote_state.get("_rev"):
        state["_rev"] = remote_state["_rev"]
    if not put_document(state, username, password):
        raise RuntimeError("Could not publish line metric state")


def collect(now_epoch=None):
    if now_epoch is None:
        now_epoch = int(time.time())
    hmac_key = keychain_secret(HMAC_SERVICE, HMAC_ACCOUNT).encode("utf-8")
    current = scan_markdown(VAULT_PATH, hmac_key)
    connection = open_state()
    try:
        summary = record_scan(connection, current, now_epoch)
        username = CREDENTIAL_ACCOUNT
        password = keychain_secret(CREDENTIAL_SERVICE, CREDENTIAL_ACCOUNT)
        upload(connection, summary, username, password)
        return summary
    finally:
        connection.close()


if __name__ == "__main__":
    result = collect()
    if result["baseline"]:
        print("Line metrics baseline established.")
    else:
        print(
            "Line metrics updated: +{0} -{1}".format(
                result["addedLines"], result["deletedLines"]
            )
        )
