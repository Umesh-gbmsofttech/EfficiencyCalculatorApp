import React, { useEffect, useRef } from "react";
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
  const lastLogRef = useRef("");

  const waitingForRole = Boolean(user) && (!roleLoaded || !profile);

  useEffect(() => {
    if (!__DEV__ || !user?.uid || !role) return;
    const snapshot = `${user.uid}:${role}:${isAdmin ? "admin" : "worker"}`;
    if (lastLogRef.current === snapshot) return;
    lastLogRef.current = snapshot;
    console.info("[RootNavigator] role resolved", { uid: user.uid, role, isAdmin });
  }, [isAdmin, role, user?.uid]);

  if (initializing || waitingForRole) {
    return <SplashScreen />;
  }

  if (user && !role) {
    console.info("[RootNavigator] missing role, waiting", { uid: user.uid });
    return null;
  }

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
