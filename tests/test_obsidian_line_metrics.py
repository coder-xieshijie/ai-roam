import importlib.util
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
SPEC = importlib.util.spec_from_file_location(
    "obsidian_line_metrics", ROOT / "scripts/collect-obsidian-line-metrics.py"
)
METRICS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(METRICS)


class LineMetricsCollectorTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self):
        self.temporary.cleanup()

    def test_scan_stores_only_keyed_identifiers_and_line_hashes(self):
        vault = self.root / "vault"
        (vault / "folder").mkdir(parents=True)
        (vault / "folder" / "private-note.md").write_text(
            "secret heading\nsecret body\n", encoding="utf-8"
        )
        (vault / ".obsidian").mkdir()
        (vault / ".obsidian" / "ignored.md").write_text("hidden")

        scanned = METRICS.scan_markdown(vault, b"test-key")

        self.assertEqual(len(scanned), 1)
        serialized = repr(scanned)
        self.assertNotIn("private-note", serialized)
        self.assertNotIn("secret heading", serialized)
        self.assertNotIn("secret body", serialized)
        file_id, line_hashes = next(iter(scanned.items()))
        self.assertEqual(len(file_id), 64)
        self.assertEqual(len(line_hashes), 2)
        self.assertTrue(all(len(line_hash) == 64 for line_hash in line_hashes))

    def test_baseline_then_counts_added_and_deleted_lines(self):
        connection = METRICS.open_state(self.root / "state.sqlite3")
        try:
            baseline = METRICS.record_scan(
                connection,
                {"a": ["one", "two"], "b": ["gone"]},
                1_000,
            )
            self.assertTrue(baseline["baseline"])
            self.assertEqual(baseline["addedLines"], 0)
            self.assertEqual(baseline["deletedLines"], 0)

            changed = METRICS.record_scan(
                connection,
                {"a": ["one", "new", "three"], "c": ["created"]},
                1_100,
            )
            self.assertFalse(changed["baseline"])
            self.assertEqual(changed["addedLines"], 3)
            self.assertEqual(changed["deletedLines"], 2)
            pending = connection.execute(
                "SELECT added_lines, deleted_lines FROM pending_events"
            ).fetchall()
            self.assertEqual(pending, [(3, 2)])
        finally:
            connection.close()

    def test_upload_sends_only_aggregate_event_and_state(self):
        connection = METRICS.open_state(self.root / "state.sqlite3")
        sent = []
        original_put = METRICS.put_document
        original_request = METRICS.request_json
        try:
            with connection:
                connection.execute(
                    """
                    INSERT INTO pending_events(
                        event_id, observed_at, added_lines, deleted_lines
                    ) VALUES ('line-event:test', 1100, 3, 2)
                    """
                )

            def fake_put(document, _username, _password):
                sent.append(document)
                return True

            METRICS.put_document = fake_put
            METRICS.request_json = lambda *_args, **_kwargs: (404, None)
            METRICS.upload(
                connection,
                {"trackingSince": 1000, "lastScannedAt": 1100},
                "metrics-user",
                "metrics-password",
            )
        finally:
            METRICS.put_document = original_put
            METRICS.request_json = original_request
            connection.close()

        self.assertEqual(len(sent), 2)
        event = sent[0]
        self.assertEqual(event["addedLines"], 3)
        self.assertEqual(event["deletedLines"], 2)
        self.assertNotIn("path", event)
        self.assertNotIn("content", event)
        self.assertEqual(sent[1]["type"], "line-metric-state")


if __name__ == "__main__":
    unittest.main()
