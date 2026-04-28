import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  lastKnownRole: null,
  initializing: true,
  roleLoaded: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) =>
    set((state) => ({
      profile,
      lastKnownRole: profile?.role || state.lastKnownRole || null
    })),
  setLastKnownRole: (lastKnownRole) => set({ lastKnownRole }),
  setInitializing: (initializing) => set({ initializing }),
  setRoleLoaded: (roleLoaded) => set({ roleLoaded })
}));

export default useAuthStore;
