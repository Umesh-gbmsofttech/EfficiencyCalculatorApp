import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRoute } from "@react-navigation/native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "./Header";
import GlobalBottomNav from "./GlobalBottomNav";
import useAuthStore from "../store/authStore";

const TITLE_MAP = {
  Dashboard: "Dashboard",
  Reports: "Reports",
  Attendance: "Attendance",
  Profile: "Profile",
  ManageWorkers: "Manage Workers",
  ManageMachines: "Manage Machines",
  ManageParts: "Manage Parts",
  SalarySystem: "Salary System",
  ReportsCenter: "Reports",
  AttendanceControl: "Attendance Control",
  WorkerAttendance: "Attendance"
};

const AppChrome = ({ role }) => {
  const route = useRoute();
  const subtitle = role === "admin" ? "Admin Panel" : "Operator Console";
  const title = TITLE_MAP[route.name] || route.name;

  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <GlobalBottomNav />
    </>
  );
};

const ScreenContainer = ({
  children,
  scroll = false,
  contentContainerStyle,
  style,
  refreshControl,
  keyboardAware = false,
  showChrome
}) => {
  const theme = useTheme();
  const { user, profile } = useAuthStore();
  const chromeVisible = showChrome ?? Boolean(user);
  const shouldAvoidKeyboard = keyboardAware || scroll;
  const Wrapper = shouldAvoidKeyboard ? KeyboardAvoidingView : View;
  const wrapperProps = shouldAvoidKeyboard ? { behavior: Platform.OS === "ios" ? "padding" : undefined } : {};

  return (
    <SafeAreaView style={styles.safeArea} edges={chromeVisible ? ["left", "right"] : ["top", "left", "right"]}>
      <Wrapper style={[styles.root, { backgroundColor: theme.colors.background }, style]} {...wrapperProps}>
      <LinearGradient
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        colors={
          theme.dark
            ? ["#0F172A", "#111C30", "#0B1220"]
            : ["#F8FAFC", "#EEF5FF", "#E2ECFF"]
        }
      />
      {chromeVisible ? <AppChrome role={profile?.role} /> : null}
      <Animated.View entering={FadeInDown.duration(280)} style={styles.inner}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentContainerStyle]}>{children}</View>
        )}
      </Animated.View>
      </Wrapper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  root: {
    flex: 1
  },
  inner: {
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120
  }
});

export default React.memo(ScreenContainer);
