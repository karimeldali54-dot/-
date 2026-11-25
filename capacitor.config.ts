import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kartelfer3on.game",
  appName: "كارت الفرعون",
  webDir: "mobile/www",
  android: {
    allowMixedContent: false,
  },
  server: {
    allowNavigation: ["*"],
    androidScheme: "https",
  },
};

export default config;
