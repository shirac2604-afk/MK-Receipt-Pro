import fs from "node:fs";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const packageJson = readJson("package.json");
const appJson = readJson("app.json");
const easJson = readJson("eas.json");
const expo = appJson.expo ?? {};
const android = expo.android ?? {};

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

// This identifier and the EAS-managed signing key are the Android app's identity.
// Changing either would make Android treat a future APK as a different application.
expect(android.package === "il.mkreceiptpro.android", "Android package must remain il.mkreceiptpro.android");
expect(Number.isInteger(android.versionCode) && android.versionCode >= 9, "Android versionCode baseline must be at least 9");
expect(packageJson.version === expo.version, "package.json and app.json must use the same visible version");
expect(/^\d+\.\d+\.\d+$/.test(String(expo.version ?? "")), "Visible Android version must use x.y.z format");
expect(easJson.cli?.appVersionSource === "remote", "EAS remote version source must remain enabled");
expect(easJson.build?.["production-apk"]?.autoIncrement === true, "Internal Android APK builds must auto-increment");
expect(easJson.build?.production?.autoIncrement === true, "Store Android builds must auto-increment");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log("PASS Android upgrade identity is stable; EAS will increment the next build number remotely.");
