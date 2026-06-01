import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import useAuthStore from "../store/authStore";
import { isAdmin } from "../utils/access";

const ADMIN_ITEMS = [
  { label: "Dashboard", route: "Dashboard", icon: "view-dashboard-outline" },
  { label: "Reports", route: "Reports", icon: "file-chart-outline" },
  { label: "Attendance", route: "Attendance", icon: "calendar-check-outline" },
  { label: "Profile", route: "Profile", icon: "account-circle-outline" }
];

const WORKER_ITEMS = [
  { label: "Dashboard", route: "Dashboard", icon: "view-dashboard-outline" },
  { label: "Reports", route: "Reports", icon: "file-chart-outline" },
  { label: "Attendance", route: "Attendance", icon: "calendar-check-outline" },
  { label: "Profile", route: "Profile", icon: "account-circle-outline" }
];

const GlobalBottomNav = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  const adminUser = isAdmin(profile?.role);
  const stackRoute = adminUser ? "AdminHomeTabs" : "WorkerHomeTabs";
  const items = adminUser ? ADMIN_ITEMS : WORKER_ITEMS;
  const barColor = theme.dark ? "#171717" : "#FFFFFF";
  const barBorderColor = theme.dark ? "rgba(147,197,253,0.3)" : "rgba(37,99,235,0.18)";
  const activeColor = theme.dark ? "#93C5FD" : "#2563EB";
  const inactiveColor = theme.dark ? "#CBD5E1" : "#475569";
  const activeBackground = theme.dark ? "rgba(96,165,250,0.18)" : "rgba(37,99,235,0.1)";

  const navigateTo = (screen) => {
    let target = navigation;
    let targetName = screen;
    let targetParams;
    let cursor = navigation;
    while (cursor) {
      const routeNames = cursor.getState?.()?.routeNames || [];
      if (routeNames.includes(stackRoute)) {
        target = cursor;
        targetName = stackRoute;
        targetParams = { screen };
        break;
      }
      if (routeNames.includes(screen)) {
        target = cursor;
        targetName = screen;
        targetParams = undefined;
        break;
      }
      cursor = cursor.getParent?.();
    }

    target.dispatch(
      CommonActions.navigate({
        name: targetName,
        params: targetParams
      })
    );
  };

  return (
    <View pointerEvents="box-none" style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <BlurView
        intensity={55}
        tint={theme.dark ? "dark" : "light"}
        style={[styles.container, { backgroundColor: barColor, borderColor: barBorderColor }]}
      >
        {items.map((item) => {
          const focused = route.name === item.route;
          return (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => navigateTo(item.route)}
              style={[
                styles.item,
                focused && {
                  backgroundColor: activeBackground
                }
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={20}
                color={focused ? activeColor : inactiveColor}
              />
              <Text style={[styles.label, { color: focused ? activeColor : inactiveColor }]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 8,
    zIndex: 50,
    elevation: 50
  },
  container: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 6
  },
  item: {
    flex: 1,
    minHeight: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600"
  }
});

export default React.memo(GlobalBottomNav);
