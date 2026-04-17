import "dotenv/config";

export default ({ config }) => ({
  ...config,
  name: "Efficiency Calculator",
  slug: "efficiency-calculator",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/logo.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/logo.png",
    resizeMode: "contain",
    backgroundColor: "#F5F5F5"
  },
  plugins: ["expo-asset"],
  assetBundlePatterns: ["**/*"],
  android: {
    package: "com.efficiency.calculator",
    adaptiveIcon: {
      foregroundImage: "./assets/logo.png",
      backgroundColor: "#F5F5F5"
    },
    googleServicesFile: "./google-services.json"
  },
  extra: {
    firebaseApiKey: process.env.FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.FIREBASE_APP_ID
  }
});
