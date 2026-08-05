import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { createFigmaAutoLauncher } from "../figma-auto-launch.js";

function successfulSpawn(calls) {
  return (command, args) => {
    calls.push({ command, args });
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => child.emit("close", 0));
    return child;
  };
}

test("macOS launcher requests only the bundled Layntra companion script", async () => {
  const calls = [];
  const launcher = createFigmaAutoLauncher({
    enabled: true,
    platform: "darwin",
    scriptPath: "/repo/scripts/launch-figma-companion.applescript",
    spawnProcess: successfulSpawn(calls),
    now: () => 1_000
  });

  assert.equal((await launcher.request()).state, "requested");
  assert.deepEqual(calls, [{
    command: "/usr/bin/osascript",
    args: ["/repo/scripts/launch-figma-companion.applescript"]
  }]);
  launcher.markConnected();
  assert.equal(launcher.status().state, "connected");
  assert.equal((await launcher.request()).state, "connected");
  assert.equal(calls.length, 1);
});

test("launcher is explicit when disabled or unsupported", async () => {
  const disabled = createFigmaAutoLauncher({ enabled: false, platform: "darwin" });
  assert.equal((await disabled.request()).state, "disabled");
  disabled.markConnected();
  disabled.markDisconnected();
  assert.equal(disabled.status().state, "disabled");

  const unsupported = createFigmaAutoLauncher({ enabled: true, platform: "linux" });
  assert.equal((await unsupported.request()).state, "unsupported");
});

test("failed launch is bounded by a cooldown and never falls back", async () => {
  const calls = [];
  let now = 1_000;
  const launcher = createFigmaAutoLauncher({
    enabled: true,
    platform: "darwin",
    scriptPath: "/repo/scripts/launch-figma-companion.applescript",
    cooldownMs: 10_000,
    now: () => now,
    spawnProcess() {
      calls.push("local");
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      queueMicrotask(() => {
        child.stderr.emit("data", "Accessibility permission denied\n");
        child.emit("close", 1);
      });
      return child;
    }
  });

  const failed = await launcher.request();
  assert.equal(failed.state, "failed");
  assert.match(failed.error, /Accessibility permission denied/);
  assert.equal((await launcher.request()).state, "failed");
  assert.equal(calls.length, 1);

  now = 11_001;
  await launcher.request();
  assert.equal(calls.length, 2);
  assert.equal(launcher.status().fallback, "none");
});

test("user suppression prevents automatic relaunch", async () => {
  const calls = [];
  const launcher = createFigmaAutoLauncher({
    enabled: true,
    platform: "darwin",
    spawnProcess: successfulSpawn(calls)
  });
  launcher.suppress();
  assert.equal((await launcher.request()).state, "disabled_by_user");
  assert.equal(calls.length, 0);
});
