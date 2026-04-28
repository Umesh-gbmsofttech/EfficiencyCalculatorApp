import "react-native-gesture-handler";
import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
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

const LocationAccessGate = () => {
  const { showSnackbar } = useUIStore();
  const { permissionStatus, servicesEnabled } = useCompanyConfig();

  useEffect(() => {
    if (permissionStatus === "denied") {
      showSnackbar("Please enable location permission for attendance and production logging.", "warning");
    }
  }, [permissionStatus, showSnackbar]);

  useEffect(() => {
    if (!servicesEnabled) {
      showSnackbar("Please turn on device location to continue restricted actions.", "warning");
    }
  }, [servicesEnabled, showSnackbar]);

  return null;
};

export default function App() {
  useAuthBootstrap();
  const systemTheme = useColorScheme();
  const { online, themeMode } = useUIStore();
  const resolvedTheme = themeMode === "system" ? (systemTheme === "dark" ? "dark" : "light") : themeMode;
  const appTheme = useMemo(() => createAppTheme(resolvedTheme), [resolvedTheme]);
  const navigationTheme = useMemo(() => createNavigationTheme(resolvedTheme), [resolvedTheme]);
  const showConfigError = Boolean(firebaseInitError);

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

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <CompanyConfigProvider>
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
