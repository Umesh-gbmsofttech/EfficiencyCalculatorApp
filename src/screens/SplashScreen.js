import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "react-native-paper";
import AppLogo from "../components/AppLogo";
import ScreenContainer from "../components/ScreenContainer";

const SplashScreen = () => {
  const theme = useTheme();
  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <View style={styles.inner}>
        <AppLogo size={140} />
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Efficiency Calculator</Text>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center"
  },
  inner: {
    alignItems: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 6
  },
  loader: {
    marginTop: 16
  }
});

export default SplashScreen;
