# ADR 0010: Local-only automatic Layntra for Figma

- Status: accepted
- Date: 2026-08-05
- Owners: Layntra maintainers

## Decision

Layntra uses only its loopback bridge and the local Figma development plugin.
The runtime contract is `transportPolicy: local_only` and `fallback: none`.
Installation fails while active Codex configuration references
`mcp.figma.com`.

On macOS, installation also disables Figma Desktop MCP's local feature flags
(`desktop_make_local_mcp_enabled` and `desktop_make_local_mcp_proxy_mode`) and
keeps a one-time backup of Figma's settings. This prevents the official Figma
Desktop MCP listener at `127.0.0.1:3845/mcp` from being discovered alongside
Layntra's `127.0.0.1:3846` bridge.

On macOS, the installer imports the current checkout's manifest and the bridge
launches the exact **Layntra for Figma** Development-menu item. Launch attempts
are idempotent, bounded by cooldown, and never select the last-run plugin.
Turning Auto-connect off suppresses relaunch.

The visible Figma plugin is a lower-left 248 × 64 connection toolbar containing
only status and an accessible Auto-connect switch.

## Consequences

- Local launch failures remain explicit and never change transport.
- macOS Accessibility permission is required for automatic menu activation.
- Other platforms report automatic launch as unsupported.
- `LAYNTRA_AUTO_LAUNCH=0` disables automatic launch for diagnosis without
  enabling hosted fallback.
