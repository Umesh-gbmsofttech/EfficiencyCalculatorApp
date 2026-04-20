import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import WorkerDashboardScreen from "../screens/worker/WorkerDashboardScreen";
import LogEfficiencyScreen from "../screens/worker/LogEfficiencyScreen";
import WorkerReportsScreen from "../screens/worker/WorkerReportsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AnimatedTabBar from "../components/AnimatedTabBar";
import Header from "../components/Header";

const Tab = createBottomTabNavigator();

const WorkerTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header title={route.name} subtitle="Worker Console" />,
      sceneStyle: { backgroundColor: "transparent" },
      tabBarIcon: ({ color, size }) => {
        const icons = {
          Dashboard: "speedometer",
          Log: "clipboard-check-outline",
          Reports: "chart-line",
          Profile: "account-circle-outline"
        };
        return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
      },
      tabBarShowLabel: false
    })}
    tabBar={(props) => <AnimatedTabBar {...props} />}
  >
    <Tab.Screen name="Dashboard" component={WorkerDashboardScreen} />
    <Tab.Screen name="Log" component={LogEfficiencyScreen} />
    <Tab.Screen name="Reports" component={WorkerReportsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default WorkerTabs;
