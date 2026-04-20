import * as yup from "yup";

export const loginSchema = yup.object({
  email: yup.string().email("Enter valid email").required("Email is required"),
  password: yup.string().min(6, "Minimum 6 characters").required("Password is required")
});

export const signupSchema = yup.object({
  fullName: yup.string().min(3, "Minimum 3 characters").required("Full name is required"),
  email: yup.string().email("Enter valid email").required("Email is required"),
  phoneNumber: yup
    .string()
    .matches(/^[0-9+\-() ]{8,15}$/, "Phone number is invalid")
    .required("Phone number is required"),
  password: yup.string().min(6, "Minimum 6 characters").required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Confirm your password")
});

export const forgotPasswordSchema = yup.object({
  email: yup.string().email("Enter valid email").required("Email is required")
});

export const machineSchema = yup.object({
  name: yup.string().required("Machine name is required"),
  code: yup.string().required("Machine code is required"),
  imageUrl: yup
    .string()
    .trim()
    .required("Machine image URL is required")
    .test("is-valid-url", "Enter a valid image URL", (value) => {
      if (!value) return false;
      return /^https?:\/\/.+/i.test(value);
    }),
  expectedOutputPerHour: yup
    .number()
    .typeError("Must be a number")
    .positive("Must be positive")
    .required("Expected output/hour is required")
});

export const workerSchema = yup.object({
  fullName: yup.string().required("Full name is required"),
  phoneNumber: yup.string().required("Phone number is required"),
  role: yup.string().oneOf(["admin", "worker"]).required("Role is required")
});

export const adminCreateWorkerSchema = yup.object({
  fullName: yup.string().required("Full name is required"),
  email: yup.string().email("Enter valid email").required("Email is required"),
  phoneNumber: yup.string().required("Phone number is required"),
  password: yup.string().min(6, "Minimum 6 characters").required("Password is required"),
  role: yup.string().oneOf(["admin", "worker"]).required("Role is required")
});

export const logSchema = yup.object({
  machineId: yup.string().required("Please select machine"),
  workingHours: yup
    .number()
    .typeError("Must be a number")
    .positive("Must be positive")
    .required("Working hours required"),
  outputProduced: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Cannot be negative")
    .required("Output is required"),
  downtime: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Cannot be negative")
    .required("Downtime is required")
});
