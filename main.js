#!/usr/bin/env node

import { promises as fs } from "node:fs";
import { join, sep } from "node:path";
const wd = process.cwd();
const args = process.argv.slice(2).reduce(
  (acc, cur) => {
    if (!"-=".includes(cur[0])) {
      if (acc.state === "data") {
        acc.files.includes(acc.last) && (acc["data"][acc.last] = cur);
        acc.state = "files";
      } else {
        cur.endsWith("/") ? acc["folders"].push(cur.slice(0, -1)) : acc[acc.state].push(cur);
        acc.length++;
      }

      acc.last = cur;
      return acc;
    }

    switch (cur.slice(1)) {
      case "d":
        acc.state = "data";
        break;
      case "f":
        acc.state = "files";
        break;
      case "F":
        acc.state = "folders";
        break;
      default:
        break;
    }

    return acc;
  },
  { state: "files", files: [], folders: [], data: {}, length: 0, last: null },
);
if (!1 /* args.length */) {
  console.log("No (file/folder)(s) passed to the create utility.");
  process.abort();
}

async function createFile(resource) {
  const dir = join(wd, resource);
  const splitDir = dir.split(sep);
  const parentFolder = splitDir.slice(0, -1).join(sep);
  const type = "file";

  try {
    const stats = await fs.stat(parentFolder).catch((err) => err);
    if (stats.code === "ENOENT") await fs.mkdir(parentFolder, { recursive: true });
    await fs.writeFile(dir, args.data[resource] || "");
    return { type, success: true, resource: dir.replace(wd, "").slice(1), error: null };
  } catch (error) {
    return { type, success: false, resource: dir.replace(wd, "").slice(1), error };
  }
}
async function createFolder(resource) {
  const dir = join(wd, resource);
  const type = "folder";
  try {
    await fs.mkdir(dir, { recursive: true });
    return { type, success: true, resource: dir.replace(wd, "").slice(1), error: null };
  } catch (error) {
    return { type, success: false, resource: dir.replace(wd, "").slice(1), error };
  }
}

Promise.allSettled([
  ...args.files.map((file) => createFile(file)),
  ...args.folders.map((folder) => createFolder(folder)),
]).then((results) => {
  if (!results.length) {
    console.log("No (file/folder)(s) passed to the create utility.");
    return;
  }
  results = results.map((res) => res.value);
  results.forEach((res) => {
    let logString = `${res.success ? "Successfully created" : "Failed to create"} ${res.type}: ${res.resource}`;
    res.type === "folder" && (logString = (logString += sep).replaceAll(sep.repeat(2), sep));
    console.log(logString);
  });
});
