#!/usr/bin/env bash
set -euo pipefail

NOTES=$(awk '/^<!-- releases -->/{found=1; next} found && /^<!-- released -->/{exit} found{print}' CHANGELOG.md)

if [[ -z "$(echo "$NOTES" | tr -d '[:space:]')" ]]; then
    echo "::error::No release notes found in the [Unreleased] section of CHANGELOG.md"
    exit 1
fi

echo "$NOTES"
