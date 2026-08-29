#!/usr/bin/env bash
set -euo pipefail

# PromptOS no longer assembles index.html from the legacy parts/part*.html files.
# index.html plus its declared ./parts/*.js script graph are the canonical browser source.
echo "PromptOS uses the canonical index.html source graph; legacy HTML assembly is retired."
node scripts/verify-control-room-tests.mjs
