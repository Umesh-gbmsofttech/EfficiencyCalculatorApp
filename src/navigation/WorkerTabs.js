import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import WorkerDashboardScreen from "../screens/worker/WorkerDashboardScreen";
import LogEfficiencyScreen from "../screens/worker/LogEfficiencyScreen";
import WorkerAttendanceScreen from "../screens/worker/WorkerAttendanceScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const WorkerTabs = () => (
  <Tab.Navigator
    screenOptions={() => ({
      headerShown: false,
      sceneStyle: { backgroundColor: "transparent" },
      tabBarShowLabel: false
    })}
    tabBar={() => null}
  >
    <Tab.Screen name="Dashboard" component={WorkerDashboardScreen} />
    <Tab.Screen name="Reports" component={LogEfficiencyScreen} />
    <Tab.Screen name="Attendance" component={WorkerAttendanceScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default WorkerTabs;
