import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "react-native-paper";

const LoadingOverlay = () => {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
};

export default LoadingOverlay;
