import React from "react";
import { StyleSheet } from "react-native";
import { Portal, Snackbar, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useUIStore from "../store/uiStore";

const AppSnackbar = () => {
  const { snackbar, hideSnackbar } = useUIStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const backgroundByType = {
    success: "rgba(34,197,94,0.94)",
    error: "rgba(239,68,68,0.95)",
    warning: "rgba(245,158,11,0.95)",
    info: "rgba(30,41,59,0.95)"
  };

  return (
    <Portal>
      <Snackbar
        visible={snackbar.visible}
        onDismiss={hideSnackbar}
        duration={3200}
        wrapperStyle={[styles.wrapper, { top: insets.top + 8 }]}
        style={[
          styles.snackbar,
          {
            backgroundColor: backgroundByType[snackbar.type] || backgroundByType.info,
            shadowColor: theme.dark ? "#020617" : "#1E293B"
          }
        ]}
      >
        {snackbar.message}
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
  }
});

export default AppSnackbar;
