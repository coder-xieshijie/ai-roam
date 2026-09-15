import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location(
    "obsidian_status", ROOT / "scripts/update-obsidian-status.py"
)
STATUS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(STATUS)


class StatusPublisherTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        root = Path(self.temporary.name)
        STATUS.CONFIG_PATH = root / "couchdb.env"
        STATUS.OUTPUT_PATH = root / "status.json"
        STATUS.STATE_PATH = root / "state" / "metrics.sqlite3"
        STATUS.CONFIG_PATH.write_text(
            "COUCHDB_USER=test-user\nCOUCHDB_PASSWORD=test-secret\n"
        )

    def tearDown(self):
        self.temporary.cleanup()

    def test_baseline_then_tracks_unique_file_changes(self):
        phase = {"value": "baseline"}

        def fake_fetch(path, username, password, method="GET", payload=None):
            self.assertEqual((username, password), ("test-user", "test-secret"))
            if path == "/_up":
                return {"status": "ok"}
            if path == "/obsidian_livesync":
                sequence = "10" if phase["value"] == "baseline" else "14"
                return {
                    "doc_count": 5,
                    "update_seq": sequence,
                    "sizes": {"file": 2048, "external": 1024},
                }
            if path == "/obsidian_livesync/_find":
                return {
                    "docs": [
                        {
                            "_id": "f:a",
                            "_rev": "1-a",
                            "type": "plain",
                            "ctime": 1,
                            "mtime": 1,
                            "size": 10,
                        },
                        {
                            "_id": "f:b",
                            "_rev": "1-b",
                            "type": "newnote",
                            "ctime": 1,
                            "mtime": 1,
                            "size": 20,
                        },
                        {"_id": "h:+chunk", "_rev": "1-h", "type": "leaf"},
                    ],
                    "bookmark": "done",
                }
            if path.startswith("/obsidian_livesync/_changes?"):
                if phase["value"] == "baseline":
                    return {"results": [], "last_seq": "10", "pending": 0}
                if phase["value"] == "changes":
                    return {
                        "results": [
                            {"id": "f:a", "seq": "11"},
                            {"id": "f:c", "seq": "12"},
                            {"id": "f:b", "seq": "13", "deleted": True},
                            {"id": "h:+new-chunk", "seq": "13-h"},
                        ],
                        "last_seq": "13",
                        "pending": 0,
                    }
                return {
                    "results": [{"id": "f:a", "seq": "14"}],
                    "last_seq": "14",
                    "pending": 0,
                }
            if path == "/obsidian_metrics/line-state%3Amac":
                return {
                    "_id": "line-state:mac",
                    "type": "line-metric-state",
                    "trackingSince": 900,
                    "lastScannedAt": 1_200,
                }
            if path.startswith("/obsidian_metrics/_all_docs?"):
                return {
                    "rows": [
                        {
                            "doc": {
                                "_id": "line-event:test",
                                "type": "line-metric",
                                "observedAt": 1_050,
                                "addedLines": 7,
                                "deletedLines": 3,
                            }
                        },
                    ]
                }
            if path == "/obsidian_livesync/f%3Aa":
                return {
                    "_id": "f:a",
                    "_rev": "2-a" if phase["value"] == "changes" else "3-a",
                    "type": "plain",
                    "ctime": 1,
                    "mtime": 2,
                    "size": 11,
                }
            if path == "/obsidian_livesync/f%3Ac":
                return {
                    "_id": "f:c",
                    "_rev": "1-c",
                    "type": "plain",
                    "ctime": 2,
                    "mtime": 2,
                    "size": 12,
                }
            self.fail("Unexpected request: " + path)

        STATUS.fetch_json = fake_fetch
        baseline = STATUS.collect_status(now_epoch=1_000)
        self.assertEqual(baseline["changeMetrics"]["windows"]["1d"]["created"], 0)
        self.assertFalse(baseline["changeMetrics"]["windows"]["1d"]["complete"])

        phase["value"] = "changes"
        changed = STATUS.collect_status(now_epoch=1_100)
        one_day = changed["changeMetrics"]["windows"]["1d"]
        self.assertEqual(
            {key: one_day[key] for key in ("created", "modified", "deleted")},
            {"created": 1, "modified": 1, "deleted": 1},
        )

        phase["value"] = "second-modification"
        repeated = STATUS.collect_status(now_epoch=1_200)
        self.assertEqual(
            repeated["changeMetrics"]["windows"]["1d"]["modified"], 1
        )
        self.assertEqual(
            repeated["lineMetrics"]["windows"]["1d"]["added"], 7
        )
        self.assertEqual(
            repeated["lineMetrics"]["windows"]["1d"]["deleted"], 3
        )
        STATUS.write_status(repeated)
        public = STATUS.OUTPUT_PATH.read_text()
        self.assertNotIn("test-user", public)
        self.assertNotIn("test-secret", public)
        self.assertEqual(json.loads(public)["schemaVersion"], 3)

    def test_preserves_previous_metrics_when_couchdb_is_offline(self):
        STATUS.OUTPUT_PATH.write_text(
            json.dumps(
                {
                    "status": "online",
                    "changeMetrics": {
                        "status": "tracking",
                        "trackingSince": "2026-09-15T00:00:00Z",
                        "windows": {"1d": {"created": 2}},
                    },
                    "lineMetrics": {
                        "status": "tracking",
                        "trackingSince": "2026-09-15T00:00:00Z",
                        "windows": {"1d": {"added": 9, "deleted": 4}},
                    },
                }
            )
        )

        def offline(*_args, **_kwargs):
            raise OSError("offline")

        STATUS.fetch_json = offline
        result = STATUS.collect_status(now_epoch=2_000)
        self.assertEqual(result["status"], "offline")
        self.assertEqual(result["changeMetrics"]["status"], "delayed")
        self.assertEqual(result["changeMetrics"]["windows"]["1d"]["created"], 2)
        self.assertEqual(result["lineMetrics"]["status"], "delayed")
        self.assertEqual(result["lineMetrics"]["windows"]["1d"]["added"], 9)


if __name__ == "__main__":
    unittest.main()
