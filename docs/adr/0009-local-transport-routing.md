# ADR 0009: Route current-file Figma requests to Layntra locally

- Status: accepted
- Date: 2026-08-05
- Owners: Layntra maintainers
- Supersedes: ADR 0003 explicit activation only

## Context

ADR 0003 required users to type `$layntra` before every workflow. An ordinary
natural-language Figma request could therefore activate an available hosted
Figma MCP integration instead. On Figma Starter plans, that transport can show
hosted MCP tool-call limits and upgrade prompts even though Layntra provides its
own loopback bridge.

Transport selection and write authorization are separate decisions. Routing a
Figma request to the installed local bridge does not require granting permission
to modify the document.

## Decision

When the user asks to inspect or edit the currently open Figma file, the Layntra
Skill activates as the default transport. It uses only the MCP server named
`layntra` and never falls back to Figma hosted MCP or the Figma app connector.

`get_status` identifies the transport as `local_loopback` and the endpoint as
`127.0.0.1:3846`. A missing local server, disconnected companion, or different
transport stops the workflow with a local recovery action.

The controlled-write contract is unchanged: read-only inspection may proceed,
while create or update work still requires a visible bounded plan and explicit
approval in the same Codex task.

## Alternatives considered

- **Keep explicit activation:** rejected because it permits silent routing to an
  installed hosted Figma integration and creates repeated command friction.
- **Fall back to hosted MCP:** rejected because it changes privacy, cost, quota,
  and authentication boundaries without user intent.
- **Disable every global Figma integration during install:** rejected because an
  installer must not mutate unrelated user configuration.

## Consequences

Natural-language current-file requests use the local bridge without consuming
Figma hosted-MCP quotas. `$layntra` remains useful as an explicit shortcut and
diagnostic signal. Users can still choose another Figma integration outside the
Layntra workflow, but Layntra itself never switches transports.

Rollback restores explicit-only activation in the Skill and removes the status
transport fields. No Figma document migration is required.
