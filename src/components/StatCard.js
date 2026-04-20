import React from "react";
import { StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";
import GlassCard from "./GlassCard";

const StatCard = ({ title, value, caption }) => {
  const theme = useTheme();
  return (
    <GlassCard>
      <Text style={[styles.title, { color: theme.custom.colors.textMuted }]}>{title}</Text>
      <Text style={[styles.value, { color: theme.colors.onSurface }]}>{value}</Text>
      {caption ? <Text style={[styles.caption, { color: theme.custom.colors.textMuted }]}>{caption}</Text> : null}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 14,
    fontWeight: "500"
  },
  value: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: "600"
  },
  caption: {
    marginTop: 4,
    fontSize: 13
  }
});

export default StatCard;
