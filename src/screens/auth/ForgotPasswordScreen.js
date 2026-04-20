import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, useTheme } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { forgotPasswordSchema } from "../../utils/validationSchemas";
import FormTextField from "../../components/FormTextField";
import { forgotPassword } from "../../services/firebase/auth";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import ScreenContainer from "../../components/ScreenContainer";
import GlassCard from "../../components/GlassCard";
import PrimaryButton from "../../components/PrimaryButton";

const ForgotPasswordScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useUIStore();
  const theme = useTheme();

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
    <ScreenContainer scroll keyboardAware contentContainerStyle={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>Forgot Password</Text>
      <Text style={[styles.subtitle, { color: theme.custom.colors.textMuted }]}>
        Enter your registered email and we will send a reset link.
      </Text>
      <GlassCard>
        <FormTextField control={control} name="email" label="Registered Email" keyboardType="email-address" />
        <PrimaryButton title="Send Reset Link" loading={loading} onPress={handleSubmit(onSubmit)} />
      </GlassCard>
      <Button onPress={() => navigation.navigate("Login")} style={styles.backBtn}>
        Back to Login
      </Button>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center"
  },
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
    marginTop: 4
  }
});

export default ForgotPasswordScreen;
