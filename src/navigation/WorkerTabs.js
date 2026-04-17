import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import WorkerDashboardScreen from "../screens/worker/WorkerDashboardScreen";
import LogEfficiencyScreen from "../screens/worker/LogEfficiencyScreen";
import WorkerReportsScreen from "../screens/worker/WorkerReportsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const WorkerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: true,
      tabBarActiveTintColor: "#2E7D32",
      tabBarIcon: ({ color, size }) => {
        const icons = {
          Dashboard: "view-dashboard",
          Log: "clipboard-text-clock-outline",
          Reports: "chart-bar",
          Profile: "account-circle-outline"
        };
        return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
      }
    })}
  >
    <Tab.Screen name="Dashboard" component={WorkerDashboardScreen} />
    <Tab.Screen name="Log" component={LogEfficiencyScreen} />
    <Tab.Screen name="Reports" component={WorkerReportsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default WorkerTabs;
