---
name: layntra
description: Local Codex-to-Figma workflow for inspecting, planning, creating, and refining the currently open Figma file. Use for natural-language requests about the current Figma canvas or when the user explicitly invokes $layntra.
---

# Layntra

Layntra is the default transport for natural-language requests to inspect or edit
the current Figma file. `$layntra` remains an explicit shortcut, but users do not
need to type it before every Figma request. Automatic routing does not grant write
permission: target, mode, plan, and approval remain explicit.

Use only the local MCP server named `layntra`. Never call hosted Figma MCP tools,
the Figma app connector, or another Figma server from this Skill. If the local
server or companion is unavailable, stop with the local setup action; do not fall
back to a hosted Figma transport. This prevents hosted MCP quotas, plan prompts,
and accidental transport changes.

## Intents

Read-only intents never change Figma:

- `status`: call the local `get_status`; require `transport: local_loopback` and
  `endpoint: 127.0.0.1:3846`, then show bridge, companion, file, page,
  selection, target, and mode. Any other transport is a configuration error.
- `inspect`: read the explicit selection or current page.
- `review`: inspect and evaluate against the user's criteria.
- `plan`: inspect, propose bounded changes, and wait for approval.

End every read-only response with: `No Figma changes made.`

Write intents are controlled:

- `create`: plan new content with target `new-frame`, then wait.
- `refine`: inspect and plan changes to target `selection`, then wait.
- `apply`: execute only the latest unexecuted plan in this Codex task.
- `undo`: undo only the latest successful Layntra apply from this Codex task.

`create` and `refine` do not write when first requested. They enter plan mode.

## Target resolution

Use exactly one target:

- `selection`: only current selected nodes and descendants.
- `page`: read-only review in version 0.1.0.
- `new-frame`: a new top-level frame; default for new content or ambiguity.

Never infer permission to change the whole page. Never delete, replace, or hide
existing work when the target is ambiguous.

## Controlled state machine

### 1. Connect and capture context

Call `get_status`. If the companion is not connected, give only the next action:
open the intended Design file and run **Plugins → Development → Layntra for
Figma**. Do not pretend the document is available.

For `selection`, call `get_selection`. For `page` or `new-frame`, call
`get_document`. Capture:

```json
{
  "pageId": "current page ID",
  "selectionIds": ["sorted current selection IDs"]
}
```

This is the plan's `expectedContext`. Do not expose node IDs unless needed for
diagnosis.

### 2. Present the plan

State:

- connected file and page;
- target and selected node count;
- nodes and properties to create or update;
- copy, colors, and nodes that will be preserved;
- unsupported or risky parts;
- approximate node count;
- confirmation instruction: `$layntra apply`.

Store the plan only in this Codex task. A newer plan replaces the older one.
Never write while presenting a plan. End with `No Figma changes made.`

### 3. Require explicit approval

Accept `$layntra apply` only when an unexecuted plan exists in the same task.
If the command is ambiguous, the plan is missing, or the user changed the goal,
inspect and present a new plan instead.

Pass `expectedContext` to every `create_nodes` or `update_nodes` call. If Figma
reports that its context changed, stop without retrying and ask the user to run
`$layntra plan` again.

Use batches of at most 100 editable `FRAME`, `RECTANGLE`, and `TEXT` nodes. Use
semantic layer names. Do not call deletion or arbitrary-code tools.

### 4. Verify observed results

After a successful write, call `get_document` or `get_selection` again. Report
only what the tool result proves:

- target changed;
- nodes created and updated;
- preserved constraints verified;
- partial or skipped work;
- recovery: enter `$layntra undo` immediately; after closing the companion,
  Figma's `Command + Z` and version history remain manual fallbacks.

Store the observed post-apply page and selection as the recovery context. Accept
`$layntra undo` only for the latest successful apply in this Codex task and only
before any newer Layntra plan or apply. Pass that recovery context to
`undo_last`, then inspect again. If the context changed, stop without undoing;
never guess which history entry belongs to Layntra.

Never claim success from a proposed plan or a tool call that returned an error.
Do not automatically retry a timed-out write.

## Product-manager examples

```text
$layntra status
```

```text
$layntra review selection
Check information hierarchy and missing loading, empty, and error states.
Do not modify Figma.
```

```text
$layntra plan selection
Goal: clarify the login card hierarchy.
Preserve: all copy and brand colors.
Do not: delete or add illustration layers.
```

```text
$layntra create
Target: new-frame
Create a 390 × 844 sign-up screen with default, loading, and validation-error states.
```

```text
$layntra apply
```

```text
$layntra undo
```
