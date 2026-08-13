/* Checks the manifest is valid MV3, that every file it references exists, and
   that all the JS parses. A broken manifest means Chrome silently refuses to
   load the extension, so this is worth catching here.
   Run from the extension directory: node test/manifest.test.js */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");
process.chdir(path.join(__dirname, ".."));

const m = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
let bad = 0;
const check = (cond, msg) => { console.log((cond ? "  ✓ " : "  ✗ ") + msg); if (!cond) bad++; };

console.log("manifest");
check(m.manifest_version === 3, "manifest_version is 3");
check(!!(m.name && m.version && m.description), "name, version and description present");
check(/^\d+(\.\d+){0,3}$/.test(m.version), "version is a valid dotted number: " + m.version);
check(Array.isArray(m.permissions) && m.permissions.includes("storage"), "requests storage");
check(!m.permissions.includes("<all_urls>") && !m.host_permissions,
      "asks for no broad host permissions");

console.log("referenced files exist");
const files = [m.background.service_worker, m.action.default_popup, m.options_ui.page,
  ...Object.values(m.icons), ...Object.values(m.action.default_icon),
  ...m.content_scripts.flatMap(c => c.js)];
[...new Set(files)].forEach(f => check(fs.existsSync(f), f));

console.log("content script matches are https and path-scoped");
m.content_scripts[0].matches.forEach(p =>
  check(/^https:\/\/www\.amazon\.[a-z.]+\/.+$/.test(p), p));

console.log("every script parses");
[...new Set([...m.content_scripts.flatMap(c => c.js), m.background.service_worker,
             "options.js", "popup.js"])].forEach(f => {
  try { new vm.Script(fs.readFileSync(f, "utf8"), {filename: f}); check(true, f); }
  catch (e) { check(false, f + " — " + e.message); }
});

console.log(bad === 0 ? "\nmanifest OK" : `\n${bad} problems`);
process.exitCode = bad ? 1 : 0;
