const firebaseErrorMap = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/email-already-in-use": "Email is already in use.",
  "auth/invalid-email": "Email format is invalid.",
  "auth/weak-password": "Password is too weak.",
  "auth/user-not-found": "No account found for this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/user-disabled": "This account is disabled.",
  "auth/network-request-failed": "Network unavailable. Please try again.",
  "auth/operation-not-allowed": "Something went wrong. Please try again.",
  "auth/operation-not-supported-in-this-environment": "Something went wrong. Please try again.",
  "permission-denied": "Access restricted.",
  unavailable: "Network unavailable. Please try again.",
  "failed-precondition": "Loading data, please wait..."
};

export const mapErrorMessage = (error) => {
  if (!error) return "Something went wrong.";
  if (typeof error === "string") {
    return error.toLowerCase().includes("operation not available")
      ? "Something went wrong. Please try again."
      : error;
  }
  if (error?.code && firebaseErrorMap[error.code]) {
    return firebaseErrorMap[error.code];
  }
  if (String(error?.message || "").toLowerCase().includes("operation not available")) {
    return "Something went wrong. Please try again.";
  }
  return error?.message || "Unexpected error occurred.";
};
