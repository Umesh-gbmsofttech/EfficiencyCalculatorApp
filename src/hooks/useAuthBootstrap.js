import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import useAuthStore from "../store/authStore";
import useUIStore from "../store/uiStore";
import { logoutUser, subscribeToAuthState } from "../services/firebase/auth";
import { getUserProfile } from "../services/firebase/firestore";
import { logger } from "../utils/logger";

const useAuthBootstrap = () => {
  const { setUser, setProfile, setInitializing } = useAuthStore();
  const { setOnline, showSnackbar } = useUIStore();

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(isOnline);
      if (!isOnline) {
        showSnackbar("You are offline. Some actions may be unavailable.", "warning");
      }
    });

    const unsubAuth = subscribeToAuthState(async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          const profile = await getUserProfile(currentUser.uid);
          if (profile?.isActive === false) {
            await logoutUser();
            showSnackbar("Your account is inactive. Contact admin.", "error");
            setProfile(null);
            return;
          }
          setProfile(profile);
        } else {
          setProfile(null);
        }
      } catch (error) {
        logger.error("Auth bootstrap failed", error);
        setProfile(null);
      } finally {
        setInitializing(false);
      }
    });

    return () => {
      unsubAuth();
      unsubNet();
    };
  }, [setInitializing, setOnline, setProfile, setUser, showSnackbar]);
};

export default useAuthBootstrap;
