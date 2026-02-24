#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-}"

if [[ -z "$TAG" ]]; then
    echo "::error::No tag provided"
    exit 1
fi

if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "::error::Tag '$TAG' is not in the expected format vX.Y.Z (e.g. v1.2.3)"
    exit 1
fi

echo "Tag '$TAG' is valid"
