// Extends app.json with the FCM config. google-services.json is gitignored, so
// EAS cloud builds get it from the GOOGLE_SERVICES_JSON file env var
// (eas env:create --type file); local runs use the file next to this one.
// Setting android.googleServicesFile is what turns reminders on (src/push.ts).
const fs = require("node:fs");
const path = require("node:path");

// oxlint-disable-next-line unicorn/no-anonymous-default-export -- Expo reads the exported function by shape
module.exports = ({ config }) => {
  const local = path.join(__dirname, "google-services.json");
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ??
    (fs.existsSync(local) ? "./google-services.json" : undefined);
  return {
    ...config,
    android: {
      ...config.android,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
  };
};
