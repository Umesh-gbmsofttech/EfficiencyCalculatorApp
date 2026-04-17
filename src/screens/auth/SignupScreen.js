import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button, HelperText, Text } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { signupSchema } from "../../utils/validationSchemas";
import { mapErrorMessage } from "../../utils/errorMapper";
import { signupUser } from "../../services/firebase/auth";
import useUIStore from "../../store/uiStore";
import FormTextField from "../../components/FormTextField";
import AppLogo from "../../components/AppLogo";

const SignupScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useUIStore();

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (values) => {
    try {
      setLoading(true);
      await signupUser(values);
      showSnackbar("Account created. You are logged in as worker.", "success");
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <AppLogo size={110} />
        <Text variant="headlineSmall" style={{ marginBottom: 8 }}>
          Sign Up
        </Text>
        <HelperText type="info">Role is assigned as worker by default. Admin can promote later.</HelperText>

        <FormTextField control={control} name="fullName" label="Full Name" />
        <FormTextField control={control} name="email" label="Email" keyboardType="email-address" />
        <FormTextField control={control} name="phoneNumber" label="Phone Number" keyboardType="phone-pad" />
        <FormTextField control={control} name="password" label="Password" secureTextEntry />
        <FormTextField control={control} name="confirmPassword" label="Confirm Password" secureTextEntry />

        <Button mode="contained" loading={loading} onPress={handleSubmit(onSubmit)} style={{ marginTop: 8 }}>
          Create Account
        </Button>
        <Button onPress={() => navigation.navigate("Login")}>Back to Login</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SignupScreen;
