import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ManageMachinesScreen from "../screens/admin/ManageMachinesScreen";
import ManageWorkersScreen from "../screens/admin/ManageWorkersScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import AdminAttendanceScreen from "../screens/admin/AdminAttendanceScreen";
import AdminSalaryScreen from "../screens/admin/AdminSalaryScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AnimatedTabBar from "../components/AnimatedTabBar";
import Header from "../components/Header";

const Tab = createBottomTabNavigator();
const TAB_ICONS = {
  Machines: "cog-outline",
  Workers: "account-multiple-outline",
  Attendance: "calendar-account-outline",
  Reports: "chart-box-outline",
  Salaries: "cash-multiple",
  Profile: "account-circle-outline"
};

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header title={route.name} subtitle="Admin Panel" />,
      sceneStyle: { backgroundColor: "transparent" },
      tabBarIcon: ({ color, size }) => {
        const name = TAB_ICONS[route.name] || "circle-outline";
        return <MaterialCommunityIcons name={name} size={size} color={color} />;
      },
      tabBarShowLabel: false
    })}
    tabBar={(props) => <AnimatedTabBar {...props} />}
  >
    <Tab.Screen name="Machines" component={ManageMachinesScreen} />
    <Tab.Screen name="Workers" component={ManageWorkersScreen} />
    <Tab.Screen name="Attendance" component={AdminAttendanceScreen} />
    <Tab.Screen name="Reports" component={AdminReportsScreen} />
    <Tab.Screen name="Salaries" component={AdminSalaryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default AdminTabs;
