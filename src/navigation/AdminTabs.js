import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ManageMachinesScreen from "../screens/admin/ManageMachinesScreen";
import ManageWorkersScreen from "../screens/admin/ManageWorkersScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import AnimatedTabBar from "../components/AnimatedTabBar";
import Header from "../components/Header";

const Tab = createBottomTabNavigator();

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      header: () => <Header title={route.name} subtitle="Admin Panel" />,
      sceneStyle: { backgroundColor: "transparent" },
      tabBarIcon: ({ color, size }) => {
        const icons = {
          Machines: "factory",
          Workers: "account-group-outline",
          Reports: "chart-line",
          Profile: "account-circle-outline"
        };
        return <MaterialCommunityIcons name={icons[route.name]} size={size} color={color} />;
      },
      tabBarShowLabel: false
    })}
    tabBar={(props) => <AnimatedTabBar {...props} />}
  >
    <Tab.Screen name="Machines" component={ManageMachinesScreen} />
    <Tab.Screen name="Workers" component={ManageWorkersScreen} />
    <Tab.Screen name="Reports" component={AdminReportsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default AdminTabs;
