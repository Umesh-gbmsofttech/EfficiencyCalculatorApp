import React from "react";
import { Snackbar } from "react-native-paper";
import useUIStore from "../store/uiStore";

const AppSnackbar = () => {
  const { snackbar, hideSnackbar } = useUIStore();

  return (
    <Snackbar
      visible={snackbar.visible}
      onDismiss={hideSnackbar}
      duration={2600}
      style={{ marginBottom: 16 }}
    >
      {snackbar.message}
    </Snackbar>
  );
};

export default AppSnackbar;
