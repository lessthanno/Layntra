#!/usr/bin/env bash
set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  printf '%s\n' "Figma Desktop MCP enforcement is macOS-only; skipped."
  exit 0
fi

settings_path="${FIGMA_SETTINGS_PATH:-${HOME}/Library/Application Support/Figma/settings.json}"
if [ ! -f "${settings_path}" ]; then
  printf '%s\n' "Figma settings were not found; Desktop MCP is not enabled by Layntra."
  exit 0
fi

backup_path="${settings_path}.layntra-before-desktop-mcp-disable.json"
if [ ! -f "${backup_path}" ]; then
  cp -p "${settings_path}" "${backup_path}"
fi

SETTINGS_PATH="${settings_path}" /usr/bin/python3 - <<'PY'
import json
import os
import tempfile

path = os.environ["SETTINGS_PATH"]
with open(path, encoding="utf-8") as handle:
    settings = json.load(handle)

flags = settings.setdefault("featureFlags", {})
changed = False
for key in ("desktop_make_local_mcp_enabled", "desktop_make_local_mcp_proxy_mode"):
    if flags.get(key) is not False:
        flags[key] = False
        changed = True

if changed:
    directory = os.path.dirname(path)
    fd, temporary = tempfile.mkstemp(prefix=".layntra-settings-", dir=directory)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(settings, handle, separators=(",", ":"), ensure_ascii=False)
            handle.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
PY

printf '%s\n' "✓ Figma Desktop MCP disabled; Layntra remains the only Figma transport."
printf '%s\n' "  Restart Figma Desktop once to stop its existing 127.0.0.1:3845/mcp listener."
