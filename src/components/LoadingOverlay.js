import React from "react";
import { ActivityIndicator, View } from "react-native";

const LoadingOverlay = () => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center"
    }}
  >
    <ActivityIndicator size="large" color="#2E7D32" />
  </View>
);

export default LoadingOverlay;
