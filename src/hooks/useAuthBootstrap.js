import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import useAuthStore from "../store/authStore";
import useUIStore from "../store/uiStore";
import { bootstrapAuthUser, logoutUser, subscribeToAuthState } from "../services/firebase/auth";
import ensureFirestoreBootstrap from "../services/firebase/bootstrapService";
import { isAdmin } from "../utils/access";
import { logInfo, logWarn } from "../utils/logger";

const useAuthBootstrap = () => {
  const { setUser, setProfile, setInitializing, setRoleLoaded, setLastKnownRole } = useAuthStore();
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
        setInitializing(true);
        setRoleLoaded(false);
        setUser(currentUser);
        if (currentUser) {
          const mergedProfile = await bootstrapAuthUser(currentUser);
          setLastKnownRole(mergedProfile.role);

          if (mergedProfile.isActive === false) {
            await logoutUser();
            showSnackbar("Your account is inactive. Contact admin.", "error");
            setProfile(null);
            setRoleLoaded(true);
            return;
          }

          logInfo("AuthBootstrap", "resolved user role", { uid: currentUser.uid, role: mergedProfile.role });
          setProfile(mergedProfile);
          setRoleLoaded(true);
          if (isAdmin(mergedProfile.role)) {
            ensureFirestoreBootstrap({ actorUid: currentUser.uid }).catch((error) => {
              logWarn("FirestoreBootstrap", "collection check skipped", { code: error?.code || "unknown" });
            });
          }
        } else {
          setProfile(null);
          setRoleLoaded(true);
        }
      } catch (error) {
        const offlineErrorCodes = new Set(["unavailable", "auth/network-request-failed"]);
        if (offlineErrorCodes.has(error?.code)) {
          showSnackbar("Network unavailable. Trying again when you are online.", "warning");
        } else if (error?.code === "failed-precondition") {
          showSnackbar("Role setup is incomplete. Contact admin.", "error");
        }
        logWarn("AuthBootstrap", "auth bootstrap error", { code: error?.code || "unknown" });
        setProfile(null);
        setRoleLoaded(false);
      } finally {
        setInitializing(false);
      }
    });

    return () => {
      unsubAuth();
      unsubNet();
    };
  }, [setInitializing, setLastKnownRole, setOnline, setProfile, setRoleLoaded, setUser, showSnackbar]);
};

export default useAuthBootstrap;
