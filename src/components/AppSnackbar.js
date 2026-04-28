import React from "react";
import { StyleSheet, Text } from "react-native";
import { Portal, Snackbar, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useUIStore from "../store/uiStore";

const AppSnackbar = () => {
  const { snackbar, hideSnackbar } = useUIStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toneByType = {
    success: { bg: "#166534", text: "#F0FDF4" },
    error: { bg: "#B91C1C", text: "#FEF2F2" },
    warning: { bg: "#F59E0B", text: "#1F2937" },
    info: { bg: "#1E293B", text: "#F8FAFC" }
  };
  const tone = toneByType[snackbar.type] || toneByType.info;

  return (
    <Portal>
      <Snackbar
        visible={snackbar.visible}
        onDismiss={hideSnackbar}
        duration={3200}
        wrapperStyle={[styles.wrapper, { bottom: insets.bottom + 12 }]}
        style={[
          styles.snackbar,
          {
            backgroundColor: tone.bg,
            shadowColor: theme.dark ? "#020617" : "#1E293B"
          }
        ]}
      >
        <Text style={[styles.message, { color: tone.text }]}>{snackbar.message}</Text>
      </Snackbar>
    </Portal>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999
  },
  snackbar: {
    borderRadius: 12,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8
  },
  message: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  }
});

export default AppSnackbar;
