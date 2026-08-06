import { execFile } from "node:child_process";
import { mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const OFFICIAL_REMOTES = new Set([
  "https://github.com/lessthanno/Layntra",
  "https://github.com/lessthanno/Layntra.git",
  "git@github.com:lessthanno/Layntra.git",
  "ssh://git@github.com/lessthanno/Layntra.git"
]);
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;

function defaultStateDirectory() {
  if (process.env.LAYNTRA_UPDATE_STATE_DIR) return process.env.LAYNTRA_UPDATE_STATE_DIR;
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Caches", "Layntra");
  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), "layntra");
}

async function defaultGit(args, { cwd, timeoutMs }) {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }
  });
  return stdout.trim();
}

async function readLastCheck(file) {
  try {
    const value = Number(await readFile(file, "utf8"));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

async function recordCheck(file, timestamp) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, String(timestamp), { mode: 0o600 });
  await rename(temporary, file);
}

function safeError(error) {
  if (error?.killed) return "Update check timed out.";
  return String(error?.message || "Update check failed.").replace(/[\r\n]+/g, " ").slice(0, 300);
}

export async function checkForUpdates({
  repoRoot,
  enabled = process.env.LAYNTRA_AUTO_UPDATE !== "0",
  intervalMs = DEFAULT_INTERVAL_MS,
  now = Date.now,
  stateDirectory = defaultStateDirectory(),
  timeoutMs = 5_000,
  trustedRemotes = OFFICIAL_REMOTES,
  git = defaultGit
} = {}) {
  if (!enabled) return { state: "disabled" };
  const checkedAt = now();
  const stateFile = path.join(stateDirectory, "last-update-check");

  try {
    const lastCheck = await readLastCheck(stateFile);
    if (checkedAt - lastCheck < intervalMs) return { state: "throttled", lastCheck };
    await recordCheck(stateFile, checkedAt);

    const root = await git(["rev-parse", "--show-toplevel"], { cwd: repoRoot, timeoutMs });
    const [actualRoot, expectedRoot] = await Promise.all([realpath(root), realpath(repoRoot)]);
    if (actualRoot !== expectedRoot) return { state: "skipped", reason: "unexpected_repository_root" };

    const remote = await git(["remote", "get-url", "origin"], { cwd: repoRoot, timeoutMs });
    if (!trustedRemotes.has(remote)) return { state: "skipped", reason: "untrusted_origin" };

    const branch = await git(["symbolic-ref", "--quiet", "--short", "HEAD"], { cwd: repoRoot, timeoutMs });
    const upstream = await git(["rev-parse", "--abbrev-ref", "@{upstream}"], { cwd: repoRoot, timeoutMs });
    if (upstream !== `origin/${branch}`) return { state: "skipped", reason: "unexpected_upstream" };

    const changes = await git(["status", "--porcelain", "--untracked-files=no"], { cwd: repoRoot, timeoutMs });
    if (changes) return { state: "skipped", reason: "tracked_changes" };

    await git(["fetch", "--quiet", "--no-tags", "origin", branch], { cwd: repoRoot, timeoutMs });
    const counts = await git(["rev-list", "--left-right", "--count", `HEAD...${upstream}`], { cwd: repoRoot, timeoutMs });
    const [ahead, behind] = counts.split(/\s+/).map(Number);
    if (!Number.isInteger(ahead) || !Number.isInteger(behind)) return { state: "failed", error: "Invalid Git divergence result." };
    if (ahead > 0) return { state: "skipped", reason: "local_commits", ahead, behind };
    if (behind === 0) return { state: "current", checkedAt };

    await git(["merge", "--ff-only", upstream], { cwd: repoRoot, timeoutMs });
    return { state: "updated", checkedAt, commits: behind, nextTaskLoadsUpdatedSkill: true };
  } catch (error) {
    return { state: "failed", error: safeError(error) };
  }
}
