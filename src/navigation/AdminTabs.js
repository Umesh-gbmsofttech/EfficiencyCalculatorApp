import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import AdminAttendanceScreen from "../screens/admin/AdminAttendanceScreen";
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

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header title={route.name} subtitle="Admin Panel" />,
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
    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
    <Tab.Screen name="Logs" component={AdminReportsScreen} />
    <Tab.Screen name="Attendance" component={AdminAttendanceScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default AdminTabs;
