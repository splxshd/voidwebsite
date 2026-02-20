#!/usr/bin/env bash
set -euo pipefail

OUTPUT_NAME="${1:-temor-site-export.zip}"

zip -r "$OUTPUT_NAME" \
  index.html styles.css \
  invoice.html invoice.css invoice.js \
  login.html login.js \
  admin.html admin.css admin.js \
  server.js package.json vercel.json README.md .gitignore

echo "Created $OUTPUT_NAME"
