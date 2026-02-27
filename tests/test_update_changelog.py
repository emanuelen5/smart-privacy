"""Tests for the update-changelog.py script."""

import os
import sys
import tempfile
import textwrap
import unittest
from datetime import datetime, timezone
from unittest.mock import patch

# Add the scripts directory to the path so we can import update_changelog.
SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "..", ".github", "scripts")
sys.path.insert(0, SCRIPTS_DIR)

from importlib import import_module

# Import the module by file name (it has no .py-friendly package structure).
update_changelog_mod = import_module("update-changelog")
update_changelog = update_changelog_mod.update_changelog


SAMPLE_CHANGELOG = textwrap.dedent("""\
    # Changelog

    All notable changes to this project will be documented in this file.

    The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
    and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

    ## [Unreleased]
    <!-- releases -->

    ### Added
    - A new feature

    <!-- released -->

    ## [1.0.0] - 2026-02-24

    ### Added
    - Initial release
""")


FIXED_DATE = datetime(2026, 2, 24, tzinfo=timezone.utc)


class TestUpdateChangelog(unittest.TestCase):
    def _run(self, tag: str, content: str = SAMPLE_CHANGELOG) -> str:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
            f.write(content)
            f.flush()
            path = f.name
        try:
            with patch.object(update_changelog_mod, "datetime") as mock_dt:
                mock_dt.now.return_value = FIXED_DATE
                mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)
                update_changelog(tag, changelog_path=path)
            with open(path) as f:
                return f.read()
        finally:
            os.unlink(path)

    def test_creates_new_unreleased_section(self):
        result = self._run("v1.1.0")
        self.assertIn("## [Unreleased]", result)

    def test_inserts_version_heading(self):
        result = self._run("v1.1.0")
        self.assertIn("## [1.1.0]", result)

    def test_preserves_releases_marker(self):
        result = self._run("v1.1.0")
        self.assertIn("<!-- releases -->", result)

    def test_preserves_released_marker(self):
        result = self._run("v1.1.0")
        self.assertIn("<!-- released -->", result)

    def test_released_marker_is_before_new_version(self):
        result = self._run("v1.1.0")
        released_pos = result.index("<!-- released -->")
        version_pos = result.index("## [1.1.0]")
        self.assertLess(released_pos, version_pos)

    def test_each_marker_appears_exactly_once(self):
        result = self._run("v1.1.0")
        self.assertEqual(result.count("<!-- releases -->"), 1)
        self.assertEqual(result.count("<!-- released -->"), 1)

    def test_new_unreleased_section_is_empty(self):
        result = self._run("v1.1.0")
        # Between <!-- releases --> and <!-- released --> should be empty
        start = result.index("<!-- releases -->") + len("<!-- releases -->")
        end = result.index("<!-- released -->")
        between = result[start:end].strip()
        self.assertEqual(between, "")

    def test_previous_release_preserved(self):
        result = self._run("v1.1.0")
        self.assertIn("## [1.0.0] - 2026-02-24", result)

    def test_strips_v_prefix_from_tag(self):
        result = self._run("v2.0.0")
        self.assertIn("## [2.0.0]", result)
        self.assertNotIn("## [v2.0.0]", result)

    def test_unreleased_content_moves_under_new_version(self):
        result = self._run("v1.1.0")
        version_pos = result.index("## [1.1.0]")
        self.assertIn("- A new feature", result[version_pos:])

    def test_compare_content(self):
        result = self._run("v1.1.0")
        expected = textwrap.dedent("""\
            # Changelog

            All notable changes to this project will be documented in this file.

            The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
            and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

            ## [Unreleased]
            <!-- releases -->

            <!-- released -->

            ## [1.1.0] - 2026-02-24

            ### Added
            - A new feature

            ## [1.0.0] - 2026-02-24

            ### Added
            - Initial release
        """)
        self.assertEqual(expected, result)


if __name__ == "__main__":
    unittest.main()
