#!/usr/bin/env bash
set -e
exec "$(dirname "$0")/scripts/test_e2e.sh" "$@"
