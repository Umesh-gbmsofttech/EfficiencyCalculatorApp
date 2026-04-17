import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

const OfflineBanner = () => (
  <View style={{ backgroundColor: "#FFE082", paddingVertical: 6, paddingHorizontal: 12 }}>
    <Text variant="labelLarge">Offline mode: displaying cached or last fetched data.</Text>
  </View>
);

export default OfflineBanner;
