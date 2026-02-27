#!/usr/bin/env python3
"""Replace the [Unreleased] section header with the given version and date,
then insert a fresh empty [Unreleased] section above it."""

import re
import sys
from datetime import datetime, timezone


def update_changelog(tag: str, changelog_path: str = "CHANGELOG.md") -> None:
    version = tag.lstrip("v")
    release_date = datetime.now(timezone.utc).date().isoformat()

    with open(changelog_path, "r") as f:
        content = f.read()

    if not re.search(r"^## \[Unreleased\]", content, re.MULTILINE):
        print(f"error: [Unreleased] section not found in {changelog_path}", file=sys.stderr)
        sys.exit(1)

    replacement = f"## [Unreleased]\n\n<!-- released -->\n\n## [{version}] - {release_date}"
    content = re.sub(r"^## \[Unreleased\].*?(?=\n<!-- released -->)", replacement, content, count=1, flags=re.MULTILINE | re.DOTALL)

    # Remove the old <!-- released --> marker (now duplicated after the replacement)
    content = content.replace(f"{replacement}\n\n<!-- released -->", replacement, 1)

    with open(changelog_path, "w") as f:
        f.write(content)

    print(f"Updated {changelog_path}: [Unreleased] -> [{version}] - {release_date}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: update-changelog.py <tag>", file=sys.stderr)
        sys.exit(1)
    update_changelog(sys.argv[1])
