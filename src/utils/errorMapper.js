const firebaseErrorMap = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/email-already-in-use": "Email is already in use.",
  "auth/invalid-email": "Email format is invalid.",
  "auth/weak-password": "Password is too weak.",
  "auth/user-not-found": "No account found for this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/network-request-failed": "Network unavailable. Please try again.",
  "permission-denied": "You do not have permission for this action."
};

export const mapErrorMessage = (error) => {
  if (!error) return "Something went wrong.";
  if (typeof error === "string") return error;
  if (error?.code && firebaseErrorMap[error.code]) {
    return firebaseErrorMap[error.code];
  }
  return error?.message || "Unexpected error occurred.";
};
