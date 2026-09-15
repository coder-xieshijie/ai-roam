#!/usr/bin/env python3
"""Publish credential-free CouchDB health and rolling file-change metrics."""

import base64
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import time
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


CONFIG_PATH = Path(
    os.environ.get(
        "OBSIDIAN_STATUS_CONFIG", "/etc/obsidian-livesync/couchdb.env"
    )
)
OUTPUT_PATH = Path(
    os.environ.get(
        "OBSIDIAN_STATUS_OUTPUT", "/var/www/obsidian-status/status.json"
    )
)
STATE_PATH = Path(
    os.environ.get(
        "OBSIDIAN_STATUS_STATE", "/var/lib/obsidian-status/metrics.sqlite3"
    )
)
COUCHDB_URL = os.environ.get("OBSIDIAN_STATUS_COUCHDB", "http://127.0.0.1:5984")
DATABASE = "obsidian_livesync"
LINE_METRICS_DATABASE = os.environ.get(
    "OBSIDIAN_LINE_METRICS_DATABASE", "obsidian_metrics"
)
FILE_TYPES = {"plain", "newnote"}
DAY_SECONDS = 24 * 60 * 60
WINDOWS = (
    ("1d", DAY_SECONDS),
    ("3d", 3 * DAY_SECONDS),
    ("7d", 7 * DAY_SECONDS),
    ("30d", 30 * DAY_SECONDS),
)
RETENTION_SECONDS = 90 * DAY_SECONDS
LINE_METRICS_STALE_SECONDS = 5 * 60


def timestamp(epoch=None):
    if epoch is None:
        moment = datetime.now(timezone.utc)
    else:
        moment = datetime.fromtimestamp(epoch, timezone.utc)
    return moment.isoformat().replace("+00:00", "Z")


def read_credentials():
    values = {}
    for raw in CONFIG_PATH.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key.strip()] = value
    return values["COUCHDB_USER"], values["COUCHDB_PASSWORD"]


def fetch_json(path, username, password, method="GET", payload=None):
    token = base64.b64encode(
        (username + ":" + password).encode("utf-8")
    ).decode("ascii")
    body = None
    if payload is not None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    request = Request(
        COUCHDB_URL + path,
        data=body,
        method=method,
        headers={
            "Authorization": "Basic " + token,
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    with urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def previous_status():
    try:
        return json.loads(OUTPUT_PATH.read_text())
    except (OSError, ValueError):
        return {}


def open_state():
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(str(STATE_PATH), timeout=10)
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
            revision TEXT,
            active INTEGER NOT NULL,
            ctime INTEGER,
            mtime INTEGER,
            size INTEGER,
            updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS file_events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_id TEXT NOT NULL,
            action TEXT NOT NULL CHECK (action IN ('created', 'modified', 'deleted')),
            observed_at INTEGER NOT NULL,
            change_seq TEXT NOT NULL,
            UNIQUE(file_id, change_seq, action)
        );
        CREATE INDEX IF NOT EXISTS file_events_observed
            ON file_events(observed_at, action, file_id);
        """
    )
    connection.commit()
    os.chmod(str(STATE_PATH), 0o600)
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


def file_values(document, observed_at):
    return (
        document.get("_rev"),
        0 if document.get("deleted") or document.get("_deleted") else 1,
        document.get("ctime"),
        document.get("mtime"),
        document.get("size"),
        observed_at,
    )


def upsert_file(connection, file_id, document, observed_at):
    connection.execute(
        """
        INSERT OR REPLACE INTO file_state(
            file_id, revision, active, ctime, mtime, size, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (file_id,) + file_values(document, observed_at),
    )


def fetch_current_files(username, password):
    files = []
    bookmark = None
    while True:
        query = {
            "selector": {"_id": {"$gt": None}},
            "fields": ["_id", "_rev", "type", "ctime", "mtime", "size", "deleted"],
            "limit": 1000,
        }
        if bookmark:
            query["bookmark"] = bookmark
        response = fetch_json(
            "/" + DATABASE + "/_find",
            username,
            password,
            method="POST",
            payload=query,
        )
        documents = response.get("docs") or []
        for document in documents:
            if (
                document.get("type") in FILE_TYPES
                and str(document.get("_id", "")).startswith("f:")
            ):
                files.append(document)
        next_bookmark = response.get("bookmark")
        if len(documents) < query["limit"] or not next_bookmark or next_bookmark == bookmark:
            break
        bookmark = next_bookmark
    return files


def initialise_tracking(connection, username, password, update_seq, observed_at):
    documents = fetch_current_files(username, password)
    with connection:
        for document in documents:
            upsert_file(connection, document["_id"], document, observed_at)
        set_metadata(connection, "tracking_started_at", observed_at)
        set_metadata(connection, "last_seq", update_seq)
        set_metadata(connection, "last_scanned_at", observed_at)


def read_file_document(file_id, username, password):
    return fetch_json(
        "/" + DATABASE + "/" + quote(file_id, safe=""), username, password
    )


def apply_change(connection, change, username, password, observed_at):
    file_id = str(change.get("id", ""))
    if not file_id.startswith("f:"):
        return
    row = connection.execute(
        "SELECT revision, active FROM file_state WHERE file_id = ?", (file_id,)
    ).fetchone()
    document = None
    deleted = bool(change.get("deleted"))
    if not deleted:
        document = read_file_document(file_id, username, password)
        if document.get("type") not in FILE_TYPES:
            return
        deleted = bool(document.get("deleted") or document.get("_deleted"))
    change_seq = json.dumps(change.get("seq"), separators=(",", ":"))
    action = None
    if deleted:
        if row is None or row[1]:
            action = "deleted"
        document = document or {"_rev": None, "deleted": True}
    elif row is None or not row[1]:
        action = "created"
    elif row[0] != document.get("_rev"):
        action = "modified"
    upsert_file(connection, file_id, document, observed_at)
    if action:
        connection.execute(
            """
            INSERT OR IGNORE INTO file_events(
                file_id, action, observed_at, change_seq
            ) VALUES (?, ?, ?, ?)
            """,
            (file_id, action, observed_at, change_seq),
        )


def consume_changes(connection, username, password, observed_at):
    since = get_metadata(connection, "last_seq")
    while True:
        parameters = urlencode(
            {"since": since, "limit": 1000, "include_docs": "false"}
        )
        response = fetch_json(
            "/" + DATABASE + "/_changes?" + parameters, username, password
        )
        results = response.get("results") or []
        next_seq = response.get("last_seq", since)
        with connection:
            for change in results:
                apply_change(connection, change, username, password, observed_at)
            set_metadata(connection, "last_seq", next_seq)
            set_metadata(connection, "last_scanned_at", observed_at)
        if not response.get("pending") or next_seq == since:
            break
        since = next_seq


def aggregate_changes(connection, now_epoch):
    started_at = int(get_metadata(connection, "tracking_started_at"))
    last_scanned_at = int(get_metadata(connection, "last_scanned_at"))
    windows = {}
    for label, seconds in WINDOWS:
        counts = {"created": 0, "modified": 0, "deleted": 0}
        rows = connection.execute(
            """
            SELECT action, COUNT(DISTINCT file_id)
            FROM file_events
            WHERE observed_at >= ?
            GROUP BY action
            """,
            (now_epoch - seconds,),
        ).fetchall()
        for action, count in rows:
            counts[action] = count
        counts["complete"] = now_epoch - started_at >= seconds
        counts["completeAt"] = timestamp(started_at + seconds)
        windows[label] = counts
    return {
        "status": "tracking",
        "trackingSince": timestamp(started_at),
        "lastScannedAt": timestamp(last_scanned_at),
        "windows": windows,
    }


def update_change_metrics(username, password, update_seq, now_epoch):
    connection = open_state()
    try:
        if get_metadata(connection, "tracking_started_at") is None:
            initialise_tracking(
                connection, username, password, update_seq, now_epoch
            )
        consume_changes(connection, username, password, now_epoch)
        with connection:
            connection.execute(
                "DELETE FROM file_events WHERE observed_at < ?",
                (now_epoch - RETENTION_SECONDS,),
            )
        return aggregate_changes(connection, now_epoch)
    finally:
        connection.close()


def empty_line_metrics(status="unavailable"):
    return {"status": status, "windows": {}}


def update_line_metrics(username, password, now_epoch):
    state = fetch_json(
        "/" + LINE_METRICS_DATABASE + "/line-state%3Amac",
        username,
        password,
    )
    parameters = urlencode(
        {
            "include_docs": "true",
            "startkey": json.dumps(
                "line-event:{0:010d}".format(now_epoch - 30 * DAY_SECONDS)
            ),
            "endkey": json.dumps("line-event:\ufff0"),
        }
    )
    response = fetch_json(
        "/" + LINE_METRICS_DATABASE + "/_all_docs?" + parameters,
        username,
        password,
    )
    events = []
    for row in response.get("rows") or []:
        document = row.get("doc") or {}
        if document.get("type") == "line-metric":
            events.append(document)
    started_at = state.get("trackingSince")
    last_scanned_at = state.get("lastScannedAt")
    if not isinstance(started_at, int) or not isinstance(last_scanned_at, int):
        return empty_line_metrics()
    windows = {}
    for label, seconds in WINDOWS:
        added = 0
        deleted = 0
        cutoff = now_epoch - seconds
        for event in events:
            observed_at = event.get("observedAt")
            if not isinstance(observed_at, int) or observed_at < cutoff:
                continue
            event_added = event.get("addedLines")
            event_deleted = event.get("deletedLines")
            if isinstance(event_added, int) and event_added > 0:
                added += event_added
            if isinstance(event_deleted, int) and event_deleted > 0:
                deleted += event_deleted
        windows[label] = {
            "added": added,
            "deleted": deleted,
            "complete": now_epoch - started_at >= seconds,
            "completeAt": timestamp(started_at + seconds),
        }
    status = (
        "delayed"
        if now_epoch - last_scanned_at > LINE_METRICS_STALE_SECONDS
        else "tracking"
    )
    return {
        "status": status,
        "trackingSince": timestamp(started_at),
        "lastScannedAt": timestamp(last_scanned_at),
        "windows": windows,
    }


def delayed_metrics(previous):
    metrics = previous.get("changeMetrics")
    if not isinstance(metrics, dict):
        return {"status": "unavailable", "windows": {}}
    copied = json.loads(json.dumps(metrics))
    copied["status"] = "delayed"
    return copied


def delayed_line_metrics(previous):
    metrics = previous.get("lineMetrics")
    if not isinstance(metrics, dict):
        return empty_line_metrics()
    copied = json.loads(json.dumps(metrics))
    copied["status"] = "delayed"
    return copied


def collect_status(now_epoch=None):
    if now_epoch is None:
        now_epoch = int(time.time())
    checked_at = timestamp(now_epoch)
    previous = previous_status()
    try:
        username, password = read_credentials()
        health = fetch_json("/_up", username, password)
        database = fetch_json("/" + DATABASE, username, password)
        if health.get("status") != "ok":
            raise RuntimeError("CouchDB health check failed")
        sizes = database.get("sizes") or {}
        status = {
            "schemaVersion": 3,
            "status": "online",
            "documentCount": database.get("doc_count"),
            "storageBytes": sizes.get("file"),
            "dataBytes": sizes.get("external"),
            "compacting": bool(database.get("compact_running")),
            "updatedAt": checked_at,
            "lastSuccessfulAt": checked_at,
        }
        try:
            status["changeMetrics"] = update_change_metrics(
                username, password, database.get("update_seq"), now_epoch
            )
        except Exception:
            status["changeMetrics"] = delayed_metrics(previous)
        try:
            status["lineMetrics"] = update_line_metrics(
                username, password, now_epoch
            )
        except Exception:
            status["lineMetrics"] = delayed_line_metrics(previous)
        return status
    except Exception:
        return {
            "schemaVersion": 3,
            "status": "offline",
            "documentCount": previous.get("documentCount"),
            "storageBytes": previous.get("storageBytes"),
            "dataBytes": previous.get("dataBytes"),
            "compacting": previous.get("compacting", False),
            "updatedAt": checked_at,
            "lastSuccessfulAt": previous.get("lastSuccessfulAt"),
            "changeMetrics": delayed_metrics(previous),
            "lineMetrics": delayed_line_metrics(previous),
        }


def write_status(status):
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(
        prefix="status-", suffix=".json", dir=str(OUTPUT_PATH.parent)
    )
    try:
        with os.fdopen(descriptor, "w") as stream:
            json.dump(status, stream, ensure_ascii=False, separators=(",", ":"))
            stream.write("\n")
        os.chmod(temporary, 0o644)
        os.replace(temporary, str(OUTPUT_PATH))
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


if __name__ == "__main__":
    write_status(collect_status())
