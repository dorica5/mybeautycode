const { withAndroidManifest } = require("expo/config-plugins");

function actionName(entry) {
  if (!entry) return "";
  return String(entry.$?.["android:name"] ?? entry?.["android:name"] ?? "");
}

function categoryName(entry) {
  if (!entry) return "";
  return String(entry.$?.["android:name"] ?? entry?.["android:name"] ?? "");
}

function isLauncherIntentFilter(filter) {
  if (!filter) return false;
  const actionsRaw = filter.action ?? [];
  const categoriesRaw = filter.category ?? [];
  const actions = Array.isArray(actionsRaw) ? actionsRaw : [actionsRaw];
  const categories = Array.isArray(categoriesRaw)
    ? categoriesRaw
    : [categoriesRaw];
  const hasMain = actions.some(
    (a) =>
      actionName(a) === "android.intent.action.MAIN" ||
      actionName(a).endsWith(".MAIN")
  );
  const hasLauncher = categories.some(
    (c) =>
      categoryName(c) === "android.intent.category.LAUNCHER" ||
      categoryName(c).endsWith(".LAUNCHER")
  );
  return hasMain && hasLauncher;
}

function isLauncherActivity(activity) {
  const filters = activity?.["intent-filter"];
  if (!filters) return false;
  const list = Array.isArray(filters) ? filters : [filters];
  return list.some(isLauncherIntentFilter);
}

/**
 * Forces the Android launch activity to portrait. `android.screenOrientation` in app.json
 * is not always applied to MainActivity in all Expo versions. We set portrait on either the
 * launcher activity (MAIN + LAUNCHER) or any activity whose name contains "MainActivity".
 */
module.exports = function withAndroidPortraitOnly(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest?.application?.[0];
    if (!app?.activity) {
      return config;
    }
    const activities = Array.isArray(app.activity) ? app.activity : [app.activity];

    /** @type {{ activity: Record<string, unknown>, reason: string }[]} */
    const targets = [];

    const launcherActs = activities.filter((a) => isLauncherActivity(a));
    if (launcherActs.length > 0) {
      launcherActs.forEach((a) => {
        targets.push({
          activity: a,
          reason: "launcher (MAIN + LAUNCHER)",
        });
      });
    }

    activities.forEach((activity) => {
      const name = String(activity.$?.["android:name"] ?? "");
      if (name.includes("MainActivity")) {
        targets.push({ activity, reason: "name contains MainActivity" });
      }
    });

    const dedup = new Map();
    for (const { activity, reason } of targets) {
      dedup.set(activity, reason);
    }
    for (const [activity] of dedup) {
      activity.$ = {
        ...activity.$,
        "android:screenOrientation": "portrait",
      };
    }

    return config;
  });
};
