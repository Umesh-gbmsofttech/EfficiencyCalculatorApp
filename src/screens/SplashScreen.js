import React from "react";
import { View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import AppLogo from "../components/AppLogo";

const SplashScreen = () => (
  <View
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F5F5F5"
    }}
  >
    <AppLogo size={160} />
    <Text variant="headlineSmall" style={{ marginBottom: 18 }}>
      Efficiency Calculator
    </Text>
    <ActivityIndicator animating />
  </View>
);

export default SplashScreen;
