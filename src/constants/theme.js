import { MD3LightTheme } from "react-native-paper";

export const palette = {
  primary: "#2E7D32",
  secondary: "#0288D1",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  text: "#1B1C1E",
  error: "#B00020"
};

export const appTheme = {
  ...MD3LightTheme,
  roundness: 10,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    secondary: palette.secondary,
    background: palette.background,
    surface: palette.surface,
    onSurface: palette.text,
    error: palette.error
  }
};
