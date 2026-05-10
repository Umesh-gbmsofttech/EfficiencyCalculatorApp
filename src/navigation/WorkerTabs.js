import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import WorkerDashboardScreen from "../screens/worker/WorkerDashboardScreen";
import LogEfficiencyScreen from "../screens/worker/LogEfficiencyScreen";
import WorkerAttendanceScreen from "../screens/worker/WorkerAttendanceScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AnimatedTabBar from "../components/AnimatedTabBar";
import Header from "../components/Header";

const Tab = createBottomTabNavigator();
const TAB_ICONS = {
  Dashboard: "view-dashboard-outline",
  Logs: "clipboard-check-outline",
  Attendance: "calendar-check-outline",
  Profile: "account-circle-outline"
};

const WorkerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header title={route.name} subtitle="Operator Console" />,
      sceneStyle: { backgroundColor: "transparent" },
      tabBarIcon: ({ color, size }) => {
        const iconName = TAB_ICONS[route.name];
        const name = iconName || "circle";
        return <MaterialCommunityIcons name={name} size={size} color={color} />;
      },
      tabBarShowLabel: false
    })}
    tabBar={(props) => <AnimatedTabBar {...props} />}
  >
    <Tab.Screen name="Dashboard" component={WorkerDashboardScreen} />
    <Tab.Screen name="Logs" component={LogEfficiencyScreen} />
    <Tab.Screen name="Attendance" component={WorkerAttendanceScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default WorkerTabs;
