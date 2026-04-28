import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, useTheme } from "react-native-paper";
import useAuthStore from "../store/authStore";
import { logoutUser } from "../services/firebase/auth";
import useUIStore from "../store/uiStore";
import { mapErrorMessage } from "../utils/errorMapper";
import AppLogo from "../components/AppLogo";
import GlassCard from "../components/GlassCard";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";

const ProfileScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar, themeMode, setThemeMode } = useUIStore();
  const theme = useTheme();

  const onLogout = async () => {
    try {
      await logoutUser();
      showSnackbar("Logged out", "info");
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  return (
    <ScreenContainer scroll>
      <AppLogo size={90} />
      <GlassCard>
        <Text style={[styles.name, { color: theme.colors.onSurface }]}>
          {profile?.fullName || user?.displayName || "User"}
        </Text>
        <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{profile?.email || user?.email}</Text>
        <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{profile?.phoneNumber || "No phone"}</Text>
        <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Role: {profile?.role || "operator"}</Text>
      </GlassCard>

      <GlassCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Theme</Text>
        <View style={styles.themeActions}>
          <Button mode={themeMode === "light" ? "contained" : "outlined"} onPress={() => setThemeMode("light")}>
            Light
          </Button>
          <Button mode={themeMode === "dark" ? "contained" : "outlined"} onPress={() => setThemeMode("dark")}>
            Dark
          </Button>
          <Button mode={themeMode === "system" ? "contained" : "outlined"} onPress={() => setThemeMode("system")}>
            System
          </Button>
        </View>
      </GlassCard>

      <PrimaryButton title="Logout" onPress={onLogout} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  name: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 6
  },
  meta: {
    fontSize: 14,
    marginBottom: 3
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8
  },
  themeActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  }
});

export default ProfileScreen;
