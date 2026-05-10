import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WorkerTabs from "./WorkerTabs";
import WorkerAttendanceScreen from "../screens/worker/WorkerAttendanceScreen";

const Stack = createNativeStackNavigator();

const WorkerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
    <Stack.Screen name="WorkerHomeTabs" component={WorkerTabs} />
    <Stack.Screen name="WorkerAttendance" component={WorkerAttendanceScreen} />
  </Stack.Navigator>
);

export default WorkerNavigator;

