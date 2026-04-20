import React from "react";
import { Snackbar } from "react-native-paper";
import useUIStore from "../store/uiStore";

const AppSnackbar = () => {
  const { snackbar, hideSnackbar } = useUIStore();
  const backgroundByType = {
    success: "rgba(34,197,94,0.94)",
    error: "rgba(239,68,68,0.95)",
    warning: "rgba(245,158,11,0.95)",
    info: "rgba(30,41,59,0.95)"
  };

  return (
    <Snackbar
      visible={snackbar.visible}
      onDismiss={hideSnackbar}
      duration={2600}
      style={{ marginBottom: 16, borderRadius: 10, backgroundColor: backgroundByType[snackbar.type] || backgroundByType.info }}
    >
      {snackbar.message}
    </Snackbar>
  );
};

export default AppSnackbar;
