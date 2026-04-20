import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  initializing: true,
  roleLoaded: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setInitializing: (initializing) => set({ initializing }),
  setRoleLoaded: (roleLoaded) => set({ roleLoaded })
}));

export default useAuthStore;
