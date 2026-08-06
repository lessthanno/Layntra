# ADR 0011: Install-once fast-forward updates

- Status: accepted
- Date: 2026-08-06
- Owners: Layntra maintainers

## Context

Importing `manifest.json` from a downloaded release archive leaves Figma bound
to a static extracted directory. Each release then requires another download,
replacement, and import. This breaks the expected install-once product model.

The existing installer already requires a Git checkout and imports the companion
from `apps/figma-plugin/manifest.json` in that checkout. Figma reloads `code.js`
and `ui.html` from the same directory whenever the development plugin starts, so
the import itself does not need to be repeated when those files change.

## Decision

The Git checkout is the installed source of truth for the Codex skill, bridge,
and Figma companion. Before the bridge module is loaded, a bootstrap checks for
updates at most once every six hours and fast-forwards the checkout's current
branch from its matching `origin` branch.

The updater MUST:

- accept only the official `github.com/lessthanno/Layntra` HTTPS or SSH remote
  as the production origin;
- disable Git credential prompts and bound each Git operation to five seconds;
- update only a clean tracked worktree with no local commits or divergence;
- use `git merge --ff-only` and never reset, delete, stash, or overwrite work;
- fail open so offline or failed checks do not prevent the installed version
  from starting;
- expose its latest state through `$layntra status`;
- allow `LAYNTRA_AUTO_UPDATE=0` as an operational kill switch.

Downloaded companion ZIPs remain release artifacts, but they are a manual,
non-updating fallback rather than the primary onboarding path.

## Alternatives considered

### Replace the extracted ZIP on each release

Rejected because it preserves the repeated manual workflow and risks importing
different copies of the same development plugin.

### Let the Figma plugin download and execute remote JavaScript

Rejected because it expands Figma network permissions, creates an unsafe code
loading boundary, and separates the companion from the bridge/skill version.

### Force-reset the checkout to the latest release

Rejected because it can destroy contributor changes and makes rollback harder.

## Rollout and observation

The next normal Layntra bridge start performs the first check. `current`,
`updated`, `throttled`, `skipped`, `failed`, and `disabled` are visible in the
status payload. The updated bridge and Figma companion load immediately; a new
Codex task loads any updated Skill instructions. Update failures do not affect
the local bridge SLO; maintainers own the updater and GitHub source availability.

## Rollback

Set `LAYNTRA_AUTO_UPDATE=0` to disable checks immediately. Checking out a pinned
tag or commit also prevents updates because detached HEAD is not eligible. Revert
`.mcp.json` to start `server.js` directly to remove the bootstrap entirely.
