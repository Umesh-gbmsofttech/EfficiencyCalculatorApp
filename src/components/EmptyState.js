import React from "react";
import { View } from "react-native";
import { Text } from "react-native-paper";

const EmptyState = ({ text = "No records found." }) => (
  <View style={{ padding: 24, alignItems: "center" }}>
    <Text variant="bodyLarge">{text}</Text>
  </View>
);

export default EmptyState;
