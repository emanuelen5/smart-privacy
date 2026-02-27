#!/usr/bin/env python3
"""Parse addons-linter JSON output and print a Markdown report to stdout."""

import json
import sys

SECTION_EMOJIS = {"Errors": "🚨", "Warnings": "⚠️", "Notices": "📝"}


def make_markdown_table(items: list) -> str:
    rows = [
        "| Code | Message | File | Description |",
        "|------|---------|------|-------------|",
    ]
    for item in items:
        code = f"`{item.get('code', '')}`"
        message = item.get("message", "").replace("|", "\\|").replace("\n", " ")
        file_ = item.get("file", "")
        if "line" in item:
            file_ += f":{item['line']}"
            if "column" in item:
                file_ += f":{item['column']}"
        file_cell = f"`{file_}`" if file_ else ""
        desc = item.get("description", "").replace("|", "\\|").replace("\n", " ")
        rows.append(f"| {code} | {message} | {file_cell} | {desc} |")
    return "\n".join(rows)


def main():
    if len(sys.argv) < 2:
        print(
            "Usage: format-linter-report.py <linter-output.json> [success|failure]",
            file=sys.stderr,
        )
        sys.exit(1)

    json_file = sys.argv[1]
    outcome = sys.argv[2] if len(sys.argv) > 2 else "failure"

    try:
        with open(json_file) as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        print(
            f"ERROR: Could not read addons-linter JSON output from {json_file!r}: {e}",
            file=sys.stderr,
        )
        sys.exit(1)

    summary = data.get("summary", {})
    errors = data.get("errors", [])
    warnings = data.get("warnings", [])
    notices = data.get("notices", [])
    sections = [("Errors", errors), ("Warnings", warnings), ("Notices", notices)]

    status_icon = "✅" if outcome == "success" else "❌"
    md_lines = [
        f"## {status_icon} addons-linter report",
        "",
        "| Errors | Warnings | Notices |",
        "|--------|----------|---------|",
        f"| {summary.get('errors', 0)} | {summary.get('warnings', 0)} | {summary.get('notices', 0)} |",
    ]
    for title, items in sections:
        if items:
            emoji = SECTION_EMOJIS.get(title, "")
            md_lines.append(f"\n### {emoji} {title}")
            md_lines.append("")
            md_lines.append(make_markdown_table(items))

    print("\n".join(md_lines))


if __name__ == "__main__":
    main()
