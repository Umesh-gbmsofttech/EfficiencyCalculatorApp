import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";
import useAuthStore from "../store/authStore";

const Header = ({ title, subtitle, onRightPress, rightIcon = "logout", showRightAction = false }) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { profile, user } = useAuthStore();
  const headerBorderColor = theme.dark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.28)";
  const headerSubtleText = theme.dark ? "#DBEAFE" : "#EFF6FF";
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
            backgroundColor: theme.colors.primary,
            borderColor: headerBorderColor,
            borderWidth: 0.8,
            shadowColor: theme.dark ? "#020617" : theme.colors.primary,
            shadowOpacity: theme.dark ? 0.22 : 0.14
          }
        ]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[theme.colors.primary, theme.custom.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: "#FFFFFF" }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: headerSubtleText }]} numberOfLines={1}>
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
                  backgroundColor: "rgba(255,255,255,0.14)",
                  borderColor: "rgba(255,255,255,0.18)",
                  borderWidth: 0.8
                }
              ]}
            >
              <MaterialCommunityIcons name={rightIcon} size={18} color="#FFFFFF" />
            </Pressable>
          ) : null}
          <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
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
    overflow: "hidden",
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
