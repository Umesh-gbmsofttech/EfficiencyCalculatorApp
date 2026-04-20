import React from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, useTheme } from "react-native-paper";

const OfflineBanner = () => {
  const theme = useTheme();
  return (
    <View style={styles.root}>
      <BlurView
        intensity={50}
        tint={theme.custom.colors.glassTint}
        style={[styles.banner, { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.24)" }]}
      >
        <MaterialCommunityIcons name="wifi-off" size={16} color={theme.custom.colors.error} />
        <Text style={[styles.text, { color: theme.colors.onSurface }]}>
          Offline mode: displaying cached or last fetched data.
        </Text>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 12,
    paddingTop: 6
  },
  banner: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1
  }
});

export default OfflineBanner;
