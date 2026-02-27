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
        print(
            f"error: [Unreleased] section not found in {changelog_path}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Replace everything from "<!-- releases -->" through "<!-- released -->"
    # with a fresh empty marker pair and the new version heading.
    # The captured group contains the unreleased content which moves
    # under the new version heading.
    def _build_replacement(m: re.Match[str]) -> str:
        unreleased_content = m.group(1).strip()
        parts = [
            f"<!-- releases -->\n\n",
            f"<!-- released -->\n\n",
            f"## [{version}] - {release_date}",
        ]
        if unreleased_content:
            parts.append(f"\n\n{unreleased_content}")
        return "".join(parts)

    content = re.sub(
        r"<!-- releases -->(.*?)<!-- released -->",
        _build_replacement,
        content,
        count=1,
        flags=re.DOTALL,
    )

    with open(changelog_path, "w") as f:
        f.write(content)

    print(f"Updated {changelog_path}: [Unreleased] -> [{version}] - {release_date}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: update-changelog.py <tag>", file=sys.stderr)
        sys.exit(1)
    update_changelog(sys.argv[1])
