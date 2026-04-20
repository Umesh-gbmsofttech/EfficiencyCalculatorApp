import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, useTheme } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { signupSchema } from "../../utils/validationSchemas";
import { mapErrorMessage } from "../../utils/errorMapper";
import { signupUser } from "../../services/firebase/auth";
import useUIStore from "../../store/uiStore";
import FormTextField from "../../components/FormTextField";
import AppLogo from "../../components/AppLogo";
import ScreenContainer from "../../components/ScreenContainer";
import GlassCard from "../../components/GlassCard";
import PrimaryButton from "../../components/PrimaryButton";

const SignupScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useUIStore();
  const theme = useTheme();

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
    <ScreenContainer scroll keyboardAware>
      <AppLogo size={100} />
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>Create Account</Text>
      <Text style={[styles.subtitle, { color: theme.custom.colors.textMuted }]}>
        Role is assigned as worker by default. Admin can promote later.
      </Text>
      <GlassCard>
        <FormTextField control={control} name="fullName" label="Full Name" autoCapitalize="words" />
        <FormTextField control={control} name="email" label="Email" keyboardType="email-address" />
        <FormTextField control={control} name="phoneNumber" label="Phone Number" keyboardType="phone-pad" />
        <FormTextField control={control} name="password" label="Password" secureTextEntry />
        <FormTextField control={control} name="confirmPassword" label="Confirm Password" secureTextEntry />
        <PrimaryButton title="Create Account" loading={loading} onPress={handleSubmit(onSubmit)} />
      </GlassCard>
      <Button onPress={() => navigation.navigate("Login")} style={styles.backBtn}>
        Back to Login
      </Button>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12
  },
  backBtn: {
    marginTop: 2
  }
});

export default SignupScreen;
