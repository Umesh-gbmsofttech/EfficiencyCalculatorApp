import React from "react";
import { ScrollView } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import useAuthStore from "../store/authStore";
import { logoutUser } from "../services/firebase/auth";
import useUIStore from "../store/uiStore";
import { mapErrorMessage } from "../utils/errorMapper";
import AppLogo from "../components/AppLogo";

const ProfileScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useUIStore();

  const onLogout = async () => {
    try {
      await logoutUser();
      showSnackbar("Logged out", "info");
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <AppLogo size={100} />
      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text variant="titleMedium">{profile?.fullName || user?.displayName || "User"}</Text>
          <Text>{profile?.email || user?.email}</Text>
          <Text>{profile?.phoneNumber || "No phone"}</Text>
          <Text>Role: {profile?.role || "worker"}</Text>
        </Card.Content>
      </Card>

      <Button mode="contained-tonal" onPress={onLogout}>
        Logout
      </Button>
    </ScrollView>
  );
};

export default ProfileScreen;
