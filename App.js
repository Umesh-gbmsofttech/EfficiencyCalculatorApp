import "react-native-gesture-handler";
import React, { useMemo } from "react";
import { useColorScheme } from "react-native";
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

export default function App() {
  useAuthBootstrap();
  const systemTheme = useColorScheme();
  const { online, themeMode } = useUIStore();
  const resolvedTheme = themeMode === "system" ? (systemTheme === "dark" ? "dark" : "light") : themeMode;
  const appTheme = useMemo(() => createAppTheme(resolvedTheme), [resolvedTheme]);
  const navigationTheme = useMemo(() => createNavigationTheme(resolvedTheme), [resolvedTheme]);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
          {!online && <OfflineBanner />}
          <RootNavigator />
        </NavigationContainer>
        <AppSnackbar />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
