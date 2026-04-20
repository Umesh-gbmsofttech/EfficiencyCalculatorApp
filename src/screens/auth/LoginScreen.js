import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, useTheme } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { loginSchema } from "../../utils/validationSchemas";
import { mapErrorMessage } from "../../utils/errorMapper";
import { loginUser } from "../../services/firebase/auth";
import useUIStore from "../../store/uiStore";
import FormTextField from "../../components/FormTextField";
import AppLogo from "../../components/AppLogo";
import ScreenContainer from "../../components/ScreenContainer";
import GlassCard from "../../components/GlassCard";
import PrimaryButton from "../../components/PrimaryButton";

const LoginScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
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
    <ScreenContainer scroll keyboardAware contentContainerStyle={styles.container}>
      <AppLogo size={120} />
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>Welcome Back</Text>
      <Text style={[styles.subtitle, { color: theme.custom.colors.textMuted }]}>
        Log in to continue tracking machine efficiency.
      </Text>
      <GlassCard style={styles.form}>
        <FormTextField control={control} name="email" label="Email" keyboardType="email-address" />
        <FormTextField control={control} name="password" label="Password" secureTextEntry />
        <PrimaryButton title="Login" loading={loading} onPress={handleSubmit(onSubmit)} style={styles.submit} />
      </GlassCard>
      <View style={styles.links}>
        <Button onPress={() => navigation.navigate("ForgotPassword")}>Forgot Password?</Button>
        <Button onPress={() => navigation.navigate("Signup")}>Create Account</Button>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "600"
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    marginBottom: 14
  },
  form: {
    marginBottom: 8
  },
  submit: {
    marginTop: 4
  },
  links: {
    marginBottom: 20
  }
});

export default LoginScreen;
