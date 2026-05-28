import React, { useEffect, useRef } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import useAuthStore from "../store/authStore";
import AuthNavigator from "./AuthNavigator";
import AdminNavigator from "./AdminNavigator";
import WorkerNavigator from "./WorkerNavigator";
import SplashScreen from "../screens/SplashScreen";
import { isAdmin } from "../utils/access";
import { logInfo } from "../utils/logger";

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { user, profile, initializing, roleLoaded } = useAuthStore();
  const role = profile?.role || null;
  const isAdminUser = isAdmin(role);
  const lastLogRef = useRef("");

  const waitingForRole = Boolean(user) && (!roleLoaded || !profile);

  useEffect(() => {
    if (!__DEV__ || !user?.uid || !role) return;
    const snapshot = `${user.uid}:${role}:${isAdminUser ? "admin" : "operator"}`;
    if (lastLogRef.current === snapshot) return;
    lastLogRef.current = snapshot;
    logInfo("RootNavigator", "role resolved", { uid: user.uid, role, isAdmin: isAdminUser });
  }, [isAdminUser, role, user?.uid]);

  if (initializing || waitingForRole) {
    return <SplashScreen />;
  }

  if (user && !role) {
    logInfo("RootNavigator", "missing role, waiting", { uid: user.uid });
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade_from_bottom", contentStyle: { backgroundColor: "transparent" } }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : isAdminUser ? (
        <Stack.Screen name="Admin" component={AdminNavigator} />
      ) : (
        <Stack.Screen name="Worker" component={WorkerNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
