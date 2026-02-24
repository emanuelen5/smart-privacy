#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-}"

if [[ -z "$TAG" ]]; then
    echo "::error::No tag provided"
    exit 1
fi

VERSION="${TAG#v}"
OUTPUT="smart-privacy-${VERSION}.zip"

# Add all git-tracked files
git ls-files | zip "$OUTPUT" -@

# Add the dist directory (build artifacts, not tracked by git)
zip -r "$OUTPUT" dist/

echo "Created $OUTPUT"
