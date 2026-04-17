import { create } from "zustand";

const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  initializing: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setInitializing: (initializing) => set({ initializing })
}));

export default useAuthStore;
