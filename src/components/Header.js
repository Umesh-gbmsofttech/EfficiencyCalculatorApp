import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import useAuthStore from "../store/authStore";

const Header = ({ title, subtitle, onRightPress, rightIcon = "logout", showRightAction = false }) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { profile, user } = useAuthStore();
  const fullName = profile?.fullName || user?.displayName || "User";
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 6 }]}>
      <BlurView
        intensity={50}
        tint={theme.custom.colors.glassTint}
        style={[
          styles.blur,
          {
            backgroundColor: theme.custom.colors.glass,
            borderColor: theme.dark ? theme.custom.colors.border : "transparent",
            borderWidth: theme.dark ? 0.8 : 0,
            shadowColor: theme.dark ? "#020617" : "#94A3B8",
            shadowOpacity: theme.dark ? 0.2 : 0.08
          }
        ]}
      >
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.custom.colors.textMuted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>
          {showRightAction ? (
            <Pressable
              onPress={onRightPress}
              style={[
                styles.iconBtn,
                {
                  borderColor: theme.dark ? theme.custom.colors.border : "transparent",
                  borderWidth: theme.dark ? 0.8 : 0
                }
              ]}
            >
              <MaterialCommunityIcons name={rightIcon} size={18} color={theme.colors.onSurface} />
            </Pressable>
          ) : null}
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{initials || "U"}</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 14,
    paddingBottom: 10
  },
  blur: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3
  },
  textWrap: {
    flex: 1,
    paddingRight: 8
  },
  title: {
    fontSize: 22,
    fontWeight: "600"
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500"
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13
  }
});

export default React.memo(Header);
