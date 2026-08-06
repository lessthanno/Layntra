import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkForUpdates } from "./auto-update.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const update = await checkForUpdates({ repoRoot });
process.env.LAYNTRA_UPDATE_STATUS = JSON.stringify(update);

if (["failed", "skipped", "updated"].includes(update.state)) {
  console.error(`Layntra update: ${update.state}${update.reason ? ` (${update.reason})` : ""}.`);
}

// Dynamic import happens after a fast-forward so this process loads the new bridge.
await import("./server.js");

