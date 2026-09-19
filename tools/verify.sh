#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
VELOCITY_ENGINE="${GODOT_BIN:-godot}"
VELOCITY_LOG_DIR="$(mktemp -d)"
trap 'rm -rf "$VELOCITY_LOG_DIR"' EXIT
"$VELOCITY_ENGINE" --headless --path . --import 2>&1 | tee "$VELOCITY_LOG_DIR/import.log"
if grep -nE 'SCRIPT ERROR|ERROR:' "$VELOCITY_LOG_DIR/import.log"; then exit 1; fi
"$VELOCITY_ENGINE" --headless --path . --fixed-fps 60 --scene res://tests/smoke.tscn -- --test 2>&1 | tee "$VELOCITY_LOG_DIR/tests.log"
if grep -nE 'SCRIPT ERROR|ERROR:|FAIL:' "$VELOCITY_LOG_DIR/tests.log"; then exit 1; fi
