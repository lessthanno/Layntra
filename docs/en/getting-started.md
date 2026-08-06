# Getting started

This guide assumes no plugin-development experience.

## Install

1. Install Node.js 20+, Codex Desktop or CLI, and Figma Desktop.
2. Clone Layntra and run `./scripts/install.sh` from the repository root to
   install the Codex plugin.
3. Open a Design file in Figma Desktop. A personal Starter workspace is the
   free path when an organization Dev/Collab/View seat blocks Design plugins.
4. The installer imports `apps/figma-plugin/manifest.json` automatically on
   macOS. If Accessibility permission blocked it, choose **Plugins → Development
   → Import plugin from manifest…** and select that file in the cloned repository.

![Figma menu path: Plugins, Development, Import plugin from manifest](../assets/figma-import-manifest-path.png)

5. Run **Plugins → Development → Layntra for Figma** once. The compact
   companion auto-connects by default and remembers the **Auto-connect** switch.
   Figma does not allow background plugins, so later editor sessions still need
   one user start. Use **Open Layntra** in the Properties panel instead of
   navigating the Development menu again.
6. Start a new Codex task so the installed plugin is loaded.

Layntra checks the official repository at startup and safely fast-forwards a
clean checkout at most once every six hours. The imported Figma path does not
change, so updates need no second download or import. Offline and locally
modified checkouts continue using the installed version.

## Confirm the connection

```text
$layntra status
```

The response should show `connected`, the file, page, selection, and read-only
mode. If it does not, use the troubleshooting guide before continuing.

## Inspect without writing

Select one frame in Figma, then enter:

```text
$layntra inspect selection
Do not modify Figma.
```

The response ends with `No Figma changes made`.

## Create the first controlled frame

```text
$layntra plan
Target: new-frame
Create a 390 × 844 sign-up screen with default, loading, and error states.
Preserve all existing nodes.
```

Review the named target, proposed nodes, preserved content, and node count. No
write has occurred yet. Approve only if it is correct:

```text
$layntra apply
```

Confirm that Figma shows individually editable layers. Layntra must re-read and
report the observed result. Enter `$layntra undo` immediately to verify guarded
recovery, then confirm that Layntra re-read the reverted document. After closing
the companion, Figma's `Command + Z` remains a manual fallback.

The companion manifest remains at `apps/figma-plugin/manifest.json`, and its
runtime menu remains **Plugins → Development → Layntra for Figma**.
