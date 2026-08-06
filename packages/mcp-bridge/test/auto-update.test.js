import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { checkForUpdates } from "../auto-update.js";

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

async function repositoryFixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), "layntra-update-"));
  const remote = path.join(directory, "remote.git");
  const seed = path.join(directory, "seed");
  const install = path.join(directory, "install");
  const stateDirectory = path.join(directory, "state");
  t.after(() => import("node:fs/promises").then(({ rm }) => rm(directory, { recursive: true, force: true })));
  git(directory, "init", "--bare", remote);
  git(directory, "init", "-b", "main", seed);
  git(seed, "config", "user.email", "test@layntra.local");
  git(seed, "config", "user.name", "Layntra Test");
  await writeFile(path.join(seed, "version.txt"), "one\n");
  git(seed, "add", "version.txt");
  git(seed, "commit", "-m", "initial");
  git(seed, "remote", "add", "origin", remote);
  git(seed, "push", "-u", "origin", "main");
  git(directory, "clone", "--branch", "main", remote, install);
  return { install, remote, seed, stateDirectory };
}

test("automatic updater fast-forwards a clean trusted checkout", async (t) => {
  const fixture = await repositoryFixture(t);
  await writeFile(path.join(fixture.seed, "version.txt"), "two\n");
  git(fixture.seed, "add", "version.txt");
  git(fixture.seed, "commit", "-m", "update");
  git(fixture.seed, "push");

  const result = await checkForUpdates({
    repoRoot: fixture.install,
    intervalMs: 0,
    stateDirectory: fixture.stateDirectory,
    trustedRemotes: new Set([fixture.remote])
  });

  assert.equal(result.state, "updated");
  assert.equal(result.commits, 1);
  assert.equal(await readFile(path.join(fixture.install, "version.txt"), "utf8"), "two\n");
});

test("automatic updater preserves tracked local changes", async (t) => {
  const fixture = await repositoryFixture(t);
  await writeFile(path.join(fixture.install, "version.txt"), "mine\n");

  const result = await checkForUpdates({
    repoRoot: fixture.install,
    intervalMs: 0,
    stateDirectory: fixture.stateDirectory,
    trustedRemotes: new Set([fixture.remote])
  });

  assert.deepEqual(result, { state: "skipped", reason: "tracked_changes" });
  assert.equal(await readFile(path.join(fixture.install, "version.txt"), "utf8"), "mine\n");
});

test("automatic updater rejects an untrusted origin and throttles checks", async (t) => {
  const fixture = await repositoryFixture(t);
  const first = await checkForUpdates({
    repoRoot: fixture.install,
    intervalMs: 60_000,
    now: () => 100_000,
    stateDirectory: fixture.stateDirectory
  });
  assert.deepEqual(first, { state: "skipped", reason: "untrusted_origin" });

  const second = await checkForUpdates({
    repoRoot: fixture.install,
    intervalMs: 60_000,
    now: () => 100_001,
    stateDirectory: fixture.stateDirectory
  });
  assert.deepEqual(second, { state: "throttled", lastCheck: 100_000 });
});

test("automatic updater fails open on a bounded Git failure", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "layntra-update-failure-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const error = new Error("git timed out");
  error.killed = true;
  const result = await checkForUpdates({
    repoRoot: directory,
    intervalMs: 0,
    stateDirectory: path.join(directory, "state"),
    git: async () => { throw error; }
  });
  assert.deepEqual(result, { state: "failed", error: "Update check timed out." });
});
