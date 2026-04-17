import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import useAuthStore from "../store/authStore";
import AuthNavigator from "./AuthNavigator";
import AdminTabs from "./AdminTabs";
import WorkerTabs from "./WorkerTabs";
import SplashScreen from "../screens/SplashScreen";

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { user, profile, initializing } = useAuthStore();

  if (initializing) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : profile?.role === "admin" ? (
        <Stack.Screen name="Admin" component={AdminTabs} />
      ) : (
        <Stack.Screen name="Worker" component={WorkerTabs} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
