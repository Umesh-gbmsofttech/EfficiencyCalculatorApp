import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AdminTabs from "./AdminTabs";
import ManageWorkersScreen from "../screens/admin/ManageWorkersScreen";
import ManageMachinesScreen from "../screens/admin/ManageMachinesScreen";
import ManagePartsScreen from "../screens/admin/ManagePartsScreen";
import AdminSalaryScreen from "../screens/admin/AdminSalaryScreen";
import AdminReportsScreen from "../screens/admin/AdminReportsScreen";
import AdminAttendanceScreen from "../screens/admin/AdminAttendanceScreen";

const Stack = createNativeStackNavigator();

const AdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
    <Stack.Screen name="AdminHomeTabs" component={AdminTabs} />
    <Stack.Screen name="ManageWorkers" component={ManageWorkersScreen} />
    <Stack.Screen name="ManageMachines" component={ManageMachinesScreen} />
    <Stack.Screen name="ManageParts" component={ManagePartsScreen} />
    <Stack.Screen name="SalarySystem" component={AdminSalaryScreen} />
    <Stack.Screen name="ReportsCenter" component={AdminReportsScreen} />
    <Stack.Screen name="AttendanceControl" component={AdminAttendanceScreen} />
  </Stack.Navigator>
);

export default AdminNavigator;
