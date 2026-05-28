import "react-native-gesture-handler";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createAppTheme, createNavigationTheme } from "./src/constants/theme";
import RootNavigator from "./src/navigation/RootNavigator";
import AppSnackbar from "./src/components/AppSnackbar";
import OfflineBanner from "./src/components/OfflineBanner";
import useAuthBootstrap from "./src/hooks/useAuthBootstrap";
import useUIStore from "./src/store/uiStore";
import { firebaseInitError, missingFirebaseEnv } from "./src/services/firebase";
import { CompanyConfigProvider } from "./src/context/companyConfig";
import { useCompanyConfig } from "./src/context/companyConfig";
import { initLogger } from "./src/utils/logger";
import { FEATURES } from "./src/config/features";

SplashScreen.preventAutoHideAsync().catch(() => {});

const LOCATION_FEATURE_ENABLED = FEATURES.LOCATION_RESTRICTION;

const LocationAccessGate = () => {
  const { showSnackbar } = useUIStore();
  const { locationRestrictionEnabled, permissionStatus, servicesEnabled, requestLocationAccess } = useCompanyConfig();
  const permissionDenied = permissionStatus !== "granted";

  useEffect(() => {
    if (!locationRestrictionEnabled) return;
    if (permissionStatus === "undetermined") {
      requestLocationAccess();
    }
  }, [locationRestrictionEnabled, permissionStatus, requestLocationAccess]);

  useEffect(() => {
    if (!locationRestrictionEnabled) return;
    if (permissionStatus === "denied") {
      showSnackbar("Please enable location permission for attendance and production logging.", "warning");
    }
  }, [locationRestrictionEnabled, permissionStatus, showSnackbar]);

  useEffect(() => {
    if (!locationRestrictionEnabled) return;
    if (!servicesEnabled) {
      showSnackbar("Please turn on device location to continue restricted actions.", "warning");
    }
  }, [locationRestrictionEnabled, servicesEnabled, showSnackbar]);

  if (!locationRestrictionEnabled) return null;
  if (permissionDenied) return null;
  return null;
};

export default function App() {
  useEffect(() => {
    initLogger();
  }, []);
  useAuthBootstrap();
  const systemTheme = useColorScheme();
  const { online, themeMode } = useUIStore();
  const resolvedTheme = themeMode === "system" ? (systemTheme === "dark" ? "dark" : "light") : themeMode;
  const appTheme = useMemo(() => createAppTheme(resolvedTheme), [resolvedTheme]);
  const navigationTheme = useMemo(() => createNavigationTheme(resolvedTheme), [resolvedTheme]);
  const showConfigError = Boolean(firebaseInitError);
  const [fontsLoaded] = useFonts(MaterialCommunityIcons.font);
  const [fontTimeoutReached, setFontTimeoutReached] = useState(false);
  const appReady = fontsLoaded || fontTimeoutReached;

  useEffect(() => {
    if (fontsLoaded) return;
    const timer = globalThis.setTimeout(() => setFontTimeoutReached(true), 3500);
    return () => globalThis.clearTimeout(timer);
  }, [fontsLoaded]);

  useEffect(() => {
    if (appReady || showConfigError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [appReady, showConfigError]);

  if (showConfigError) {
    console.error("[FirebaseConfig] Missing EXPO_PUBLIC variables", missingFirebaseEnv);
    return (
      <SafeAreaProvider>
        <PaperProvider theme={appTheme}>
          <View style={[styles.errorWrap, { backgroundColor: appTheme.colors.background }]}>
            <Text style={[styles.errorTitle, { color: appTheme.colors.error }]}>Configuration Error</Text>
            <Text style={[styles.errorText, { color: appTheme.colors.onSurface }]}>{firebaseInitError}</Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }
  if (!appReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <CompanyConfigProvider locationRestrictionEnabled={LOCATION_FEATURE_ENABLED}>
          <LocationAccessGate />
          <NavigationContainer theme={navigationTheme}>
            <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
            {!online && <OfflineBanner />}
            <RootNavigator />
          </NavigationContainer>
        </CompanyConfigProvider>
        <AppSnackbar />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    padding: 24,
    justifyContent: "center"
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22
  }
});
