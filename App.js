import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { Provider as PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { appTheme } from "./src/constants/theme";
import RootNavigator from "./src/navigation/RootNavigator";
import AppSnackbar from "./src/components/AppSnackbar";
import OfflineBanner from "./src/components/OfflineBanner";
import useAuthBootstrap from "./src/hooks/useAuthBootstrap";
import useUIStore from "./src/store/uiStore";

export default function App() {
  useAuthBootstrap();
  const { online } = useUIStore();

  return (
    <SafeAreaProvider>
      <PaperProvider theme={appTheme}>
        <NavigationContainer>
          <StatusBar style="dark" />
          {!online && <OfflineBanner />}
          <RootNavigator />
        </NavigationContainer>
        <AppSnackbar />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
