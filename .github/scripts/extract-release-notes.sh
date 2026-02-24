#!/usr/bin/env bash
set -euo pipefail

NOTES=$(awk '/^## \[Unreleased\]/{found=1; next} found && /^## \[/{exit} found{print}' CHANGELOG.md)

if [[ -z "$(echo "$NOTES" | tr -d '[:space:]')" ]]; then
    echo "::error::No release notes found in the [Unreleased] section of CHANGELOG.md"
    exit 1
fi

echo "$NOTES"
