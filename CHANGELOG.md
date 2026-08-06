# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and semantic versioning.

## [Unreleased]

### Added

- Install-once automatic updates that safely fast-forward clean official
  checkouts before loading the local bridge.
- Persistent Auto-connect control, explicit local connection states, and a
  Properties-panel **Open Layntra** relaunch action.
- Local transport identity in `$layntra status`.

### Changed

- Replaced the bilingual Figma onboarding panel with a compact English-only
  connection control.
- Route natural-language requests for the current Figma file through Layntra's
  loopback bridge without falling back to Figma hosted MCP.

## [0.1.0] - 2026-08-01

### Added

- Explicit `$layntra` inspect, plan, approve, apply, and verify workflow.
- Guarded `$layntra undo` recovery for the latest successful apply.
- Local Figma context snapshots and stale-write protection.
- English and Simplified Chinese onboarding for product managers.
- Clean installer, public audit, CI, and open-source governance.

### Changed

- Rebranded the Codex plugin and Figma companion as Layntra.
- Reorganized runtime code into clear Skill, bridge, and Figma adapter boundaries.
