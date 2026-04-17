import { create } from "zustand";

const useUIStore = create((set) => ({
  online: true,
  snackbar: { visible: false, message: "", type: "info" },
  setOnline: (online) => set({ online }),
  showSnackbar: (message, type = "info") =>
    set({
      snackbar: { visible: true, message, type }
    }),
  hideSnackbar: () =>
    set((state) => ({
      snackbar: { ...state.snackbar, visible: false }
    }))
}));

export default useUIStore;
