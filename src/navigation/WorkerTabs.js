import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import WorkerDashboardScreen from "../screens/worker/WorkerDashboardScreen";
import LogEfficiencyScreen from "../screens/worker/LogEfficiencyScreen";
import WorkerReportsScreen from "../screens/worker/WorkerReportsScreen";
import WorkerAttendanceScreen from "../screens/worker/WorkerAttendanceScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AnimatedTabBar from "../components/AnimatedTabBar";
import Header from "../components/Header";

const Tab = createBottomTabNavigator();
const TAB_ICONS = {
  Dashboard: "view-dashboard-outline",
  Attendance: "calendar-check-outline",
  Log: "clipboard-check-outline",
  Reports: "chart-box-outline",
  Profile: "account-circle-outline"
};

const WorkerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header title={route.name} subtitle="Operator Console" />,
      sceneStyle: { backgroundColor: "transparent" },
      tabBarIcon: ({ color, size }) => {
        const name = TAB_ICONS[route.name] || "circle-outline";
        return <MaterialCommunityIcons name={name} size={size} color={color} />;
      },
      tabBarShowLabel: false
    })}
    tabBar={(props) => <AnimatedTabBar {...props} />}
  >
    <Tab.Screen name="Dashboard" component={WorkerDashboardScreen} />
    <Tab.Screen name="Attendance" component={WorkerAttendanceScreen} />
    <Tab.Screen name="Log" component={LogEfficiencyScreen} />
    <Tab.Screen name="Reports" component={WorkerReportsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default WorkerTabs;
