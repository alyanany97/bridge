#!/usr/bin/env bash
set -euo pipefail
cd frontend
npm run build
cd ..
firebase deploy --only hosting
