# ADR 0008: Explicit Figma companion connection controls

- Status: accepted
- Date: 2026-08-05
- Owners: Layntra maintainers

## Context

The original companion opened with bilingual onboarding, a three-step tutorial,
and an unconditional reconnect loop. It did not expose a connection control or
remember user intent. Users could not tell whether the local bridge was loading,
connected, unavailable, or intentionally disabled.

Figma plugins cannot run in the background and their actions must be initiated
by a user. The Plugin API does support persistent local `clientStorage` and
document-level relaunch actions. A relaunch action can reduce repeated menu
navigation, but it cannot honestly promise automatic startup.

Authoritative platform references:

- https://developers.figma.com/docs/plugins/#user-actions
- https://developers.figma.com/docs/plugins/api/properties/nodes-setrelaunchdata/
- https://developers.figma.com/docs/plugins/api/figma-ui/

## Decision

The Figma companion will:

1. Use a compact English-only operational UI instead of onboarding copy.
2. Show `loading`, `connecting`, `connected`, `unavailable`, and `off` states.
3. Provide an accessible Auto-connect switch, enabled by default and persisted
   through `figma.clientStorage`.
4. Retry safe connection attempts with bounded exponential backoff while the
   switch is enabled.
5. Register an **Open Layntra** document relaunch action in the Figma Properties
   panel.
6. State the one-start-per-editor-session platform boundary in one short note.

MCP write approval, target validation, node limits, and undo behavior remain
unchanged.

## Alternatives considered

- **Keep the tutorial window:** rejected because it obscures operational state
  after onboarding and forces localization into the daily-use control surface.
- **Pretend to auto-start:** rejected because Figma prohibits background plugins.
- **Hide the UI after connecting:** rejected because the plugin would become hard
  to discover or stop, and Figma would still treat it as a running action.
- **Require a Connect click on every run:** rejected because safe local connection
  intent can be remembered without weakening write approval.

## Consequences

Users still initiate the plugin once per Figma editor session. After that start,
the connection follows their saved setting and reconnects without manual clicks.
The relaunch button provides the shortest supported path in later sessions.

Rollback is source-only: restore the previous manifest, UI, and preference
handling. The stored boolean is harmless to older versions.
