import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const ScreenContainer = ({
  children,
  scroll = false,
  contentContainerStyle,
  style,
  refreshControl,
  keyboardAware = false
}) => {
  const theme = useTheme();
  const shouldAvoidKeyboard = keyboardAware || scroll;
  const Wrapper = shouldAvoidKeyboard ? KeyboardAvoidingView : View;
  const wrapperProps = shouldAvoidKeyboard ? { behavior: Platform.OS === "ios" ? "padding" : undefined } : {};

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <Wrapper style={[styles.root, { backgroundColor: theme.colors.background }, style]} {...wrapperProps}>
      <LinearGradient
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        colors={
          theme.dark
            ? ["#0F172A", "#111C30", "#0B1220"]
            : ["#F8FAFC", "#EEF5FF", "#E2ECFF"]
        }
      />
      <Animated.View entering={FadeInDown.duration(280)} style={styles.inner}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, contentContainerStyle]}>{children}</View>
        )}
      </Animated.View>
      </Wrapper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  root: {
    flex: 1
  },
  inner: {
    flex: 1
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120
  }
});

export default React.memo(ScreenContainer);
