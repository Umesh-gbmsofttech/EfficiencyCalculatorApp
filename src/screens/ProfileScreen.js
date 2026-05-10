import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, useTheme } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import useAuthStore from "../store/authStore";
import { logoutUser } from "../services/firebase/auth";
import useUIStore from "../store/uiStore";
import { mapErrorMessage } from "../utils/errorMapper";
import AppLogo from "../components/AppLogo";
import GlassCard from "../components/GlassCard";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";
import { isAdmin } from "../utils/access";
import { ADMIN_STACK_ROUTES } from "../constants/routes";

const ProfileScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar, themeMode, setThemeMode } = useUIStore();
  const theme = useTheme();
  const navigation = useNavigation();
  const isAdminUser = isAdmin(profile?.role);

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

      {isAdminUser ? (
        <GlassCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Admin Panel</Text>
          <View style={styles.adminActions}>
            <Button mode="contained-tonal" onPress={() => navigation.navigate(ADMIN_STACK_ROUTES.MANAGE_WORKERS)}>Manage Workers</Button>
            <Button mode="contained-tonal" onPress={() => navigation.navigate(ADMIN_STACK_ROUTES.MANAGE_MACHINES)}>Manage Machines</Button>
            <Button mode="contained-tonal" onPress={() => navigation.navigate(ADMIN_STACK_ROUTES.MANAGE_PARTS)}>Manage Parts</Button>
            <Button mode="contained-tonal" onPress={() => navigation.navigate(ADMIN_STACK_ROUTES.ATTENDANCE)}>Attendance</Button>
            <Button mode="contained-tonal" onPress={() => navigation.navigate(ADMIN_STACK_ROUTES.SALARY)}>Salary</Button>
            <Button mode="contained-tonal" onPress={() => navigation.navigate(ADMIN_STACK_ROUTES.REPORTS)}>Reports</Button>
          </View>
        </GlassCard>
      ) : null}

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
  },
  adminActions: {
    gap: 8
  }
});

export default ProfileScreen;
