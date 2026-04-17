import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button, Text } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { forgotPasswordSchema } from "../../utils/validationSchemas";
import FormTextField from "../../components/FormTextField";
import { forgotPassword } from "../../services/firebase/auth";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";

const ForgotPasswordScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useUIStore();

  const { control, handleSubmit } = useForm({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });

  const onSubmit = async ({ email }) => {
    try {
      setLoading(true);
      await forgotPassword(email);
      showSnackbar("Reset email sent successfully.", "success");
      navigation.navigate("Login");
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: "center" }}>
        <Text variant="headlineSmall" style={{ marginBottom: 12 }}>
          Forgot Password
        </Text>
        <FormTextField control={control} name="email" label="Registered Email" keyboardType="email-address" />
        <Button mode="contained" loading={loading} onPress={handleSubmit(onSubmit)}>
          Send Reset Link
        </Button>
        <Button onPress={() => navigation.navigate("Login")}>Back to Login</Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;
