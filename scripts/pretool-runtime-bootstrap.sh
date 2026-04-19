#!/bin/sh
set -eu

node ./scripts/runtime-touch.js --source hook >/dev/null 2>&1 || true
