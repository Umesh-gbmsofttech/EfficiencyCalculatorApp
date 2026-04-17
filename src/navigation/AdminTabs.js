import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AdminDashboardScreen from "../screens/admin/AdminDashboardScreen";
import ManageMachinesScreen from "../screens/admin/ManageMachinesScreen";
import ManageWorkersScreen from "../screens/admin/ManageWorkersScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: true,
      tabBarActiveTintColor: "#2E7D32",
      tabBarIcon: ({ color, size }) => {
        const icons = {
          Dashboard: "view-dashboard",
          Machines: "cog-outline",
          Workers: "account-group-outline",
          Reports: "chart-line",
          Profile: "account-circle-outline"
        };
        return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
      }
    })}
  >
    <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
    <Tab.Screen name="Machines" component={ManageMachinesScreen} />
    <Tab.Screen name="Workers" component={ManageWorkersScreen} />
    <Tab.Screen name="Reports" component={AdminReportsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default AdminTabs;
