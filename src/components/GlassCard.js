import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useTheme } from "react-native-paper";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GlassCard = ({ children, style, contentStyle, onPress, intensity = 45 }) => {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const pressHandlers = onPress
    ? {
        onPress,
        onPressIn: () => {
          scale.value = withSpring(0.985, { damping: 20, stiffness: 240 });
        },
        onPressOut: () => {
          scale.value = withSpring(1, { damping: 20, stiffness: 240 });
        }
      }
    : {};

  return (
    <AnimatedPressable
      {...pressHandlers}
      style={[
        styles.card,
        {
          borderColor: theme.dark ? theme.custom.colors.border : "transparent",
          borderWidth: theme.dark ? 0.8 : 0,
          shadowColor: theme.dark ? "#020617" : "#93C5FD",
          shadowOpacity: theme.dark ? 0.2 : 0.12
        },
        animatedStyle,
        style
      ]}
    >
      <BlurView
        intensity={intensity}
        tint={theme.custom.colors.glassTint}
        style={[StyleSheet.absoluteFill, styles.blur, { backgroundColor: theme.custom.colors.glass }]}
      />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3
  },
  blur: {
    borderRadius: 12
  },
  content: {
    padding: 14
  }
});

export default React.memo(GlassCard);
