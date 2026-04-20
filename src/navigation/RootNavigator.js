import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import useAuthStore from "../store/authStore";
import AuthNavigator from "./AuthNavigator";
import AdminTabs from "./AdminTabs";
import WorkerTabs from "./WorkerTabs";
import SplashScreen from "../screens/SplashScreen";

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { user, profile, initializing, roleLoaded } = useAuthStore();
  const role = profile?.role || null;
  const isAdmin = role === "admin";

  const waitingForRole = Boolean(user) && (!roleLoaded || !profile);

  if (initializing || waitingForRole) {
    return <SplashScreen />;
  }

  if (user && !role) {
    console.info("[RootNavigator] missing role, waiting", { uid: user.uid });
    return null;
  }

  console.info("[RootNavigator] role resolved", { uid: user?.uid || "guest", role: role || "none", isAdmin });

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade_from_bottom", contentStyle: { backgroundColor: "transparent" } }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : isAdmin ? (
        <Stack.Screen name="Admin" component={AdminTabs} />
      ) : (
        <Stack.Screen name="Worker" component={WorkerTabs} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
