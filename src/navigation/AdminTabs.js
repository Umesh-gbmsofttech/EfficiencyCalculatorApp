import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import AdminAttendanceScreen from "../screens/admin/AdminAttendanceScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={() => ({
      headerShown: false,
      sceneStyle: { backgroundColor: "transparent" },
      tabBarShowLabel: false
    })}
    tabBar={() => null}
  >
    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
    <Tab.Screen name="Reports" component={AdminReportsScreen} />
    <Tab.Screen name="Attendance" component={AdminAttendanceScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default AdminTabs;
