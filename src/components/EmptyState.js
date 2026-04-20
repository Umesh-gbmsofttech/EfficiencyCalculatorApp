import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, useTheme } from "react-native-paper";

const EmptyState = ({ text = "No records found." }) => {
  const theme = useTheme();
  return (
    <View style={styles.root}>
      <View style={[styles.iconWrap, { backgroundColor: theme.dark ? "#1B2942" : "#E8F0FF" }]}>
        <MaterialCommunityIcons name="database-search-outline" size={24} color={theme.colors.primary} />
      </View>
      <Text style={[styles.text, { color: theme.custom.colors.textMuted }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    padding: 24,
    alignItems: "center"
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  text: {
    fontSize: 15,
    textAlign: "center"
  }
});

export default EmptyState;
