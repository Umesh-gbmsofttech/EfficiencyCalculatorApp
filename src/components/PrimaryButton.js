import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useTheme } from "react-native-paper";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PrimaryButton = ({ title, onPress, loading = false, disabled = false, style, textStyle, leftIcon }) => {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.7 : 1
  }));

  return (
    <AnimatedPressable
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.96, { damping: 18, stiffness: 250 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 250 });
      }}
      style={[styles.root, animatedStyle, style]}
    >
      <LinearGradient colors={[theme.colors.primary, theme.custom.colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.row}>
            {leftIcon}
            <Text style={[styles.text, textStyle]}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  root: {
    borderRadius: 12,
    overflow: "hidden"
  },
  gradient: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF"
  }
});

export default React.memo(PrimaryButton);
