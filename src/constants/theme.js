import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme } from "@react-navigation/native";
import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

export const tokens = {
  colors: {
    primary: "#2563EB",
    darkPrimary: "#1E293B",
    accent: "#0EA5E9",
    success: "#22C55E",
    error: "#EF4444",
    lightBackground: "#F8FAFC",
    darkBackground: "#0F172A",
    glass: "rgba(255,255,255,0.1)"
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32
  },
  radius: {
    sm: 10,
    md: 12,
    lg: 14
  },
  typography: {
    title: 24,
    subtitle: 17,
    body: 15
  }
};

const lightColors = {
  primary: tokens.colors.primary,
  secondary: tokens.colors.accent,
  background: tokens.colors.lightBackground,
  surface: "#FFFFFF",
  onSurface: "#0F172A",
  textMuted: "#475569",
  border: "rgba(148,163,184,0.26)",
  glass: "rgba(255,255,255,0.86)",
  inputSurface: "#F8FAFC",
  glassTint: "light"
};

const darkColors = {
  primary: "#3B82F6",
  secondary: "#38BDF8",
  background: tokens.colors.darkBackground,
  surface: "#111C30",
  onSurface: "#E2E8F0",
  textMuted: "#94A3B8",
  border: "rgba(226,232,240,0.14)",
  glass: "rgba(15,23,42,0.26)",
  inputSurface: "#111C30",
  glassTint: "dark"
};

export const createAppTheme = (mode = "light") => {
  const isDark = mode === "dark";
  const base = isDark ? MD3DarkTheme : MD3LightTheme;
  const palette = isDark ? darkColors : lightColors;
  return {
    ...base,
    dark: isDark,
    roundness: tokens.radius.md,
    colors: {
      ...base.colors,
      primary: palette.primary,
      secondary: palette.secondary,
      background: palette.background,
      surface: palette.surface,
      onSurface: palette.onSurface,
      onBackground: palette.onSurface,
      error: tokens.colors.error,
      outline: palette.border
    },
    custom: {
      ...tokens,
      colors: {
        ...tokens.colors,
        ...palette
      }
    }
  };
};

export const createNavigationTheme = (mode = "light") => {
  const isDark = mode === "dark";
  const base = isDark ? NavigationDarkTheme : NavigationLightTheme;
  const palette = isDark ? darkColors : lightColors;
  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: "transparent",
      text: palette.onSurface,
      border: "transparent",
      notification: tokens.colors.error
    }
  };
};
