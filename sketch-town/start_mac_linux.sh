#!/usr/bin/env bash
# Sketch Town launcher for macOS / Linux.  ./start_mac_linux.sh [--watch DIR] [--host 0.0.0.0]
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "First run: creating Python environment..."
  python3 -m venv .venv
fi
source .venv/bin/activate
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
python server/server.py "$@"
