import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("plugin declares exactly one local Figma transport", async () => {
  const config = JSON.parse(await readFile(".mcp.json", "utf8"));
  assert.deepEqual(Object.keys(config.mcpServers), ["layntra"]);
  assert.equal(config.mcpServers.layntra.command, "node");
  assert.equal(config.mcpServers.layntra.cwd, "./packages/mcp-bridge");
  assert.deepEqual(config.mcpServers.layntra.args, ["bootstrap.js"]);
  assert.equal("url" in config.mcpServers.layntra, false);
});

test("Layntra policy never references or falls back to the hosted Figma endpoint", async () => {
  const files = [
    ".mcp.json",
    ".codex-plugin/plugin.json",
    "skills/layntra/SKILL.md",
    "packages/mcp-bridge/server.js"
  ];
  const content = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.doesNotMatch(content, /https:\/\/mcp\.figma\.com/i);
  assert.match(content, /local_only/);
  assert.match(content, /fallback[^\n]*none/i);
});

test("installer audits active hosted Figma conflicts before registration", async () => {
  const installer = await readFile("scripts/install.sh", "utf8");
  const audit = await readFile("scripts/audit-hosted-figma-mcp.sh", "utf8");
  assert.match(installer, /audit-hosted-figma-mcp\.sh/);
  assert.match(audit, /mcp\.figma\.com/);
  assert.match(audit, /exit 1/);
});

test("macOS automation selects only the exact local Layntra development plugin", async () => {
  const launchScript = await readFile("scripts/launch-figma-companion.applescript", "utf8");
  const importScript = await readFile("scripts/import-figma-companion.applescript", "utf8");
  assert.match(launchScript, /menu item "Layntra for Figma"/);
  assert.match(importScript, /menu item "Import plugin from manifest…"/);
  assert.doesNotMatch(`${launchScript}\n${importScript}`, /mcp\.figma\.com|last plugin|key code 35/i);
});
