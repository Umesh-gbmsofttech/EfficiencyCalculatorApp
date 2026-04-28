import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import useAuthStore from "../store/authStore";
import useUIStore from "../store/uiStore";
import { logoutUser, subscribeToAuthState } from "../services/firebase/auth";
import { getUserProfile, getUserRole } from "../services/firebase/firestore";

const normalizeRole = (value) => (value === "worker" ? "operator" : value);
const wait = (ms) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));

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
          const previousRole = normalizeRole(
            useAuthStore.getState().profile?.role || useAuthStore.getState().lastKnownRole || null
          );
          let role = null;
          try {
            const roleDoc = await getUserRole(currentUser.uid);
            role = roleDoc?.role || null;
          } catch (roleError) {
            if (roleError?.code === "unavailable") {
              await wait(1200);
              try {
                const retryDoc = await getUserRole(currentUser.uid);
                role = retryDoc?.role || null;
              } catch {
                // keep graceful fallback behavior
              }
            }
            console.warn("[AuthBootstrap] role fetch fallback", {
              uid: currentUser.uid,
              code: roleError?.code || "unknown"
            });
          }

          let profile = null;
          try {
            profile = await getUserProfile(currentUser.uid);
          } catch (profileError) {
            console.warn("[AuthBootstrap] profile fetch fallback", {
              uid: currentUser.uid,
              code: profileError?.code || "unknown"
            });
          }

          const mergedProfile = {
            uid: currentUser.uid,
            email: currentUser.email || profile?.email || "",
            fullName: profile?.fullName || currentUser.displayName || "Worker",
            phoneNumber: profile?.phoneNumber || "",
            isActive: profile?.isActive !== false,
            role: normalizeRole(role || profile?.role || previousRole || "operator")
          };
          setLastKnownRole(mergedProfile.role);

          if (mergedProfile.isActive === false) {
            await logoutUser();
            showSnackbar("Your account is inactive. Contact admin.", "error");
            setProfile(null);
            setRoleLoaded(true);
            return;
          }

          console.info("[AuthBootstrap] resolved user role", { uid: currentUser.uid, role: mergedProfile.role });
          setProfile(mergedProfile);
          setRoleLoaded(true);
        } else {
          setProfile(null);
          setRoleLoaded(true);
        }
      } catch (error) {
        const offlineErrorCodes = new Set([
          "unavailable",
          "failed-precondition",
          "auth/network-request-failed"
        ]);
        if (offlineErrorCodes.has(error?.code)) {
          showSnackbar("Network unavailable. Trying again when you are online.", "warning");
        }
        console.warn("[AuthBootstrap] auth bootstrap error", { code: error?.code || "unknown" });
        if (currentUser) {
          const previousRole = normalizeRole(
            useAuthStore.getState().profile?.role || useAuthStore.getState().lastKnownRole || null
          );
          setProfile({
            uid: currentUser.uid,
            email: currentUser.email || "",
            fullName: currentUser.displayName || "Worker",
            phoneNumber: "",
            isActive: true,
            role: previousRole || "operator"
          });
        } else {
          setProfile(null);
        }
        setRoleLoaded(true);
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
