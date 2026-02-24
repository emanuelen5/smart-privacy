#!/usr/bin/env python3
"""Run addons-linter, produce a readable console summary and write Markdown to GITHUB_STEP_SUMMARY."""
import json
import os
import subprocess
import sys


def format_console_item(item: dict) -> str:
    lines = [f"  [{item.get('_type', '?').upper()}] {item.get('code', '')}"]
    lines.append(f"  Message: {item.get('message', '')}")
    file_ = item.get("file", "")
    if file_:
        if "line" in item:
            file_ += f":{item['line']}"
            if "column" in item:
                file_ += f":{item['column']}"
        lines.append(f"  File:    {file_}")
    desc = item.get("description", "")
    if desc:
        lines.append(f"  Detail:  {desc}")
    return "\n".join(lines)


def make_markdown_table(items: list) -> str:
    rows = ["| Code | Message | File | Description |", "|------|---------|------|-------------|"]
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
        print("Usage: lint-addon.py <extension-zip-or-dir>", file=sys.stderr)
        sys.exit(1)

    target = sys.argv[1:]
    result = subprocess.run(
        ["npx", "addons-linter", "--warnings-as-errors", "-o", "json"] + target,
        capture_output=True,
        text=True,
    )

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        print("ERROR: Could not parse addons-linter output as JSON:", file=sys.stderr)
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        sys.exit(result.returncode)

    summary = data.get("summary", {})
    errors = data.get("errors", [])
    warnings = data.get("warnings", [])
    notices = data.get("notices", [])

    # === Console output ===
    sections = [("Errors", errors), ("Warnings", warnings), ("Notices", notices)]
    for title, items in sections:
        if items:
            print(f"\n{'=' * 60}")
            print(f" {title} ({len(items)})")
            print(f"{'=' * 60}")
            for item in items:
                print(format_console_item(item))
                print()

    print(
        f"\nSummary: {summary.get('errors', 0)} error(s), "
        f"{summary.get('warnings', 0)} warning(s), "
        f"{summary.get('notices', 0)} notice(s)"
    )

    # === Markdown for GITHUB_STEP_SUMMARY ===
    status_icon = "✅" if result.returncode == 0 else "❌"
    md_lines = [
        f"## {status_icon} addons-linter report",
        "",
        f"| Errors | Warnings | Notices |",
        f"|--------|----------|---------|",
        f"| {summary.get('errors', 0)} | {summary.get('warnings', 0)} | {summary.get('notices', 0)} |",
    ]
    for title, items in sections:
        if items:
            md_lines.append(f"\n### {title}")
            md_lines.append("")
            md_lines.append(make_markdown_table(items))

    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        try:
            with open(step_summary, "a") as f:
                f.write("\n".join(md_lines) + "\n")
        except OSError as e:
            print(f"WARNING: Could not write to GITHUB_STEP_SUMMARY: {e}", file=sys.stderr)

    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
