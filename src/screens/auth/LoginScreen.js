import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginSchema } from "../../utils/validationSchemas";
import { mapErrorMessage } from "../../utils/errorMapper";
import { loginUser } from "../../services/firebase/auth";
import useUIStore from "../../store/uiStore";
import FormTextField from "../../components/FormTextField";
import AppLogo from "../../components/AppLogo";

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useUIStore();
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const onSubmit = async (values) => {
    try {
      setLoading(true);
      await loginUser(values);
      showSnackbar("Login successful", "success");
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, justifyContent: "center", flexGrow: 1 }}>
        <AppLogo size={130} />
        <Text variant="headlineMedium" style={{ marginBottom: 12 }}>
          Welcome Back
        </Text>
        <FormTextField control={control} name="email" label="Email" keyboardType="email-address" />
        <FormTextField control={control} name="password" label="Password" secureTextEntry />

        <Button mode="contained" loading={loading} onPress={handleSubmit(onSubmit)} style={{ marginTop: 8 }}>
          Login
        </Button>
        <View style={{ marginTop: 8 }}>
          <Button onPress={() => navigation.navigate("ForgotPassword")}>Forgot Password?</Button>
          <Button onPress={() => navigation.navigate("Signup")}>Create Account</Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
