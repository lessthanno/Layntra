#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd "${script_dir}/.." && pwd -P)"

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

if ! command -v node >/dev/null 2>&1; then
  fail "Node.js 20 or later is required."
fi

node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "${node_major}" -lt 20 ]; then
  fail "Node.js 20 or later is required; found $(node --version)."
fi

if ! command -v codex >/dev/null 2>&1; then
  fail "Codex is not installed or is not on PATH. Install or update Codex Desktop first."
fi

bash "${script_dir}/audit-hosted-figma-mcp.sh"

existing_root="$(codex plugin marketplace list | sed -n 's/^layntra[[:space:]][[:space:]]*//p')"
if [ -n "${existing_root}" ] && [ "${existing_root}" != "${repo_root}" ]; then
  fail "Layntra is already registered from a different repository: ${existing_root}\nExisting Codex configuration was not changed."
fi

if [ "${existing_root}" = "${repo_root}" ]; then
  marketplace_added=false
else
  codex plugin marketplace add "${repo_root}"
  marketplace_added=true
fi

codex plugin add layntra@layntra

manifest_path="${repo_root}/apps/figma-plugin/manifest.json"
figma_imported=false
if [ "${LAYNTRA_SKIP_FIGMA_IMPORT:-0}" != "1" ] && [ "$(uname -s)" = "Darwin" ] && [ -d "/Applications/Figma.app" ]; then
  if /usr/bin/osascript "${script_dir}/import-figma-companion.applescript" "${manifest_path}"; then
    figma_imported=true
  else
    fail "Layntra was installed in Codex, but Layntra for Figma could not be imported automatically. Hosted Figma MCP remains disabled. Grant Accessibility access, open a Design file in Figma Desktop, and run this installer again."
  fi
fi

if [ "${marketplace_added}" = true ]; then
  echo "✓ Registered the Layntra Codex marketplace"
else
  echo "✓ Layntra Codex marketplace is already registered"
fi
echo "✓ Layntra is installed"
if [ "${figma_imported}" = true ]; then
  echo "✓ Layntra for Figma is imported from the current repository"
fi
echo
echo "Next:"
echo "1. Open the Design file you want to edit in Figma Desktop"
echo "2. Keep Auto-connect on; the local bridge launches Layntra for Figma automatically"
echo "3. If automatic import was unavailable, import ${manifest_path} once from Plugins → Development"
echo '4. Start a new Codex task and enter: $layntra status'
