#!/usr/bin/env python3
"""Publish a credential-free snapshot of the local CouchDB sync status."""

import base64
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
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
COUCHDB_URL = os.environ.get("OBSIDIAN_STATUS_COUCHDB", "http://127.0.0.1:5984")
DATABASE = "obsidian_livesync"


def timestamp():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


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


def fetch_json(path, username, password):
    token = base64.b64encode(
        (username + ":" + password).encode("utf-8")
    ).decode("ascii")
    request = Request(
        COUCHDB_URL + path,
        headers={"Authorization": "Basic " + token, "Accept": "application/json"},
    )
    with urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def previous_status():
    try:
        return json.loads(OUTPUT_PATH.read_text())
    except (OSError, ValueError):
        return {}


def collect_status():
    checked_at = timestamp()
    previous = previous_status()
    try:
        username, password = read_credentials()
        health = fetch_json("/_up", username, password)
        database = fetch_json("/" + DATABASE, username, password)
        if health.get("status") != "ok":
            raise RuntimeError("CouchDB health check failed")
        sizes = database.get("sizes") or {}
        return {
            "schemaVersion": 1,
            "status": "online",
            "documentCount": database.get("doc_count"),
            "storageBytes": sizes.get("file"),
            "dataBytes": sizes.get("external"),
            "compacting": bool(database.get("compact_running")),
            "updatedAt": checked_at,
            "lastSuccessfulAt": checked_at,
        }
    except Exception:
        return {
            "schemaVersion": 1,
            "status": "offline",
            "documentCount": previous.get("documentCount"),
            "storageBytes": previous.get("storageBytes"),
            "dataBytes": previous.get("dataBytes"),
            "compacting": previous.get("compacting", False),
            "updatedAt": checked_at,
            "lastSuccessfulAt": previous.get("lastSuccessfulAt"),
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
