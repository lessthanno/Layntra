import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_SCRIPT_PATH = fileURLToPath(
  new URL("../../scripts/launch-figma-companion.applescript", import.meta.url)
);

function cleanError(value) {
  return String(value || "Layntra for Figma launch failed.")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 500);
}

export function createFigmaAutoLauncher({
  enabled = process.env.LAYNTRA_AUTO_LAUNCH !== "0",
  platform = process.platform,
  scriptPath = DEFAULT_SCRIPT_PATH,
  spawnProcess = spawn,
  now = Date.now,
  cooldownMs = 10_000
} = {}) {
  let state = !enabled ? "disabled" : platform === "darwin" ? "idle" : "unsupported";
  let error = null;
  let lastAttemptAt = null;
  let connected = false;
  let suppressed = false;
  let inFlight = null;

  function status() {
    return {
      state: connected ? "connected" : state,
      fallback: "none",
      ...(lastAttemptAt === null ? {} : { lastAttemptAt }),
      ...(error ? { error } : {})
    };
  }

  function markConnected() {
    connected = true;
    suppressed = false;
    state = "connected";
    error = null;
  }

  function markDisconnected() {
    connected = false;
    if (!suppressed) state = !enabled ? "disabled" : platform === "darwin" ? "idle" : "unsupported";
  }

  function suppress() {
    connected = false;
    suppressed = true;
    state = "disabled_by_user";
    error = null;
  }

  async function request() {
    if (connected || suppressed || !enabled || platform !== "darwin") return status();
    if (inFlight) return inFlight;
    const requestedAt = now();
    if (lastAttemptAt !== null && requestedAt - lastAttemptAt < cooldownMs) return status();

    lastAttemptAt = requestedAt;
    state = "launching";
    error = null;
    inFlight = new Promise((resolve) => {
      let child;
      let stderr = "";
      let settled = false;

      const finish = (nextState, nextError = null) => {
        if (settled) return;
        settled = true;
        if (!connected) state = nextState;
        error = nextError;
        resolve(status());
      };

      try {
        child = spawnProcess("/usr/bin/osascript", [scriptPath], {
          stdio: ["ignore", "ignore", "pipe"]
        });
      } catch (spawnError) {
        finish("failed", cleanError(spawnError.message));
        return;
      }

      child.stderr?.on("data", (chunk) => {
        if (stderr.length < 2_000) stderr += chunk.toString("utf8");
      });
      child.on("error", (spawnError) => finish("failed", cleanError(spawnError.message)));
      child.on("close", (code) => {
        if (code === 0) {
          finish("requested");
        } else {
          finish("failed", cleanError(stderr || `Launcher exited with code ${code}.`));
        }
      });
    }).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return { markConnected, markDisconnected, request, status, suppress };
}
