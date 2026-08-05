#!/usr/bin/env bash
set -euo pipefail

codex_user_dir="${CODEX_HOME:-${HOME}/.codex}"
violations=()

if [ -f "${codex_user_dir}/config.toml" ] && rg -Fq 'mcp.figma.com' "${codex_user_dir}/config.toml"; then
  violations+=("${codex_user_dir}/config.toml")
fi

if [ -d "${codex_user_dir}/skills" ]; then
  while IFS= read -r file; do
    violations+=("${file}")
  done < <(rg -Fl 'mcp.figma.com' "${codex_user_dir}/skills" -g 'openai.yaml' -g 'SKILL.md' 2>/dev/null || true)
fi

if [ "${#violations[@]}" -gt 0 ]; then
  printf '%s\n' "Blocked: hosted Figma MCP is active. Layntra requires a local-only transport." >&2
  printf '  %s\n' "${violations[@]}" >&2
  printf '%s\n' "Disable or move these entries, then run the installer again." >&2
  exit 1
fi

printf '%s\n' "✓ No active hosted Figma MCP configuration found"
