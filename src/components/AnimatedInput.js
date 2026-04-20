import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";

const AnimatedInput = ({
  label,
  value,
  onChangeText,
  onBlur,
  secureTextEntry = false,
  keyboardType = "default",
  error,
  autoCapitalize = "none",
  style
}) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);
  const hasValue = String(value || "").length > 0;
  const focusProgress = useSharedValue(0);
  const labelProgress = useSharedValue(hasValue ? 1 : 0);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focusProgress, focused]);

  useEffect(() => {
    labelProgress.value = withTiming(focused || hasValue ? 1 : 0, { duration: 180 });
  }, [focused, hasValue, labelProgress]);

  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusProgress.value,
      [0, 1],
      [theme.custom.colors.border, theme.colors.primary]
    )
  }));

  const labelStyle = useAnimatedStyle(() => ({
    top: interpolate(labelProgress.value, [0, 1], [17, 8]),
    fontSize: interpolate(labelProgress.value, [0, 1], [15, 12]),
    color: interpolateColor(
      labelProgress.value,
      [0, 1],
      [theme.custom.colors.textMuted, theme.colors.primary]
    )
  }));

  return (
    <View style={style}>
      <Animated.View style={[styles.inputWrap, { backgroundColor: theme.custom.colors.inputSurface }, boxStyle]}>
        <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
        <TextInput
          value={String(value || "")}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          keyboardType={keyboardType}
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          style={[styles.input, { color: theme.colors.onSurface }]}
          placeholderTextColor={theme.custom.colors.textMuted}
        />
        {secureTextEntry ? (
          <MaterialCommunityIcons
            onPress={() => setHidden((prev) => !prev)}
            name={hidden ? "eye-off-outline" : "eye-outline"}
            size={18}
            color={theme.custom.colors.textMuted}
            style={styles.eye}
          />
        ) : null}
      </Animated.View>
      <Text style={[styles.error, { color: theme.custom.colors.error }]}>{error || " "}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  inputWrap: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 58,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  label: {
    position: "absolute",
    left: 14,
    fontWeight: "500"
  },
  input: {
    fontSize: 15,
    marginTop: 14,
    paddingVertical: 8,
    paddingRight: 28
  },
  eye: {
    position: "absolute",
    right: 12,
    top: 20
  },
  error: {
    minHeight: 18,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2
  }
});

export default React.memo(AnimatedInput);
