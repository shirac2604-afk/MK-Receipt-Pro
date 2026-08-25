import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const build = packageJson.build ?? {};
const nsis = build.nsis ?? {};
const target = build.win?.target?.[0];
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

// electron-builder derives the NSIS upgrade GUID from appId. Do not set a new
// explicit GUID here: that would prevent existing installations from updating.
expect(build.appId === "il.co.mkreceipt.desktop", "Windows appId must remain il.co.mkreceipt.desktop");
expect(!Object.hasOwn(nsis, "guid"), "NSIS guid must remain appId-derived for upgrade continuity");
expect(build.productName === "מפתחות להצלחה", "Windows product name must remain stable");
expect(build.win?.executableName === "MaptehotLaHatzlaha", "Windows executable name must remain stable");
expect(target?.target === "nsis" && target.arch?.includes("x64"), "Windows release must use the x64 NSIS installer");
expect(nsis.perMachine === false, "Windows installer mode must remain per-user for upgrade continuity");
expect(nsis.deleteAppDataOnUninstall === false, "Windows installer must preserve app data during an upgrade");
expect(/^\d+\.\d+\.\d+$/.test(String(packageJson.version ?? "")), "Windows version must use x.y.z format");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("PASS Windows upgrade identity is stable; the next higher version will update the existing installation.");
