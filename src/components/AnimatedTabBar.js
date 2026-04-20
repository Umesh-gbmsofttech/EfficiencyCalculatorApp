import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "react-native-paper";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TabItem = ({ route, focused, label, options, onPress, onLongPress }) => {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const icon = options.tabBarIcon?.({
    focused,
    color: focused ? theme.colors.primary : theme.custom.colors.textMuted,
    size: 20
  });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [ { scale: scale.value } ]
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={ focused ? { selected: true } : {} }
      onPress={ onPress }
      onLongPress={ onLongPress }
      onPressIn={ () => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 260 });
      } }
      onPressOut={ () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 260 });
      } }
      style={ [
        styles.item,
        focused && {
          backgroundColor: theme.dark ? "rgba(59,130,246,0.22)" : "rgba(37,99,235,0.12)"
        },
        animatedStyle
      ] }
    >
      { icon }
      <Text style={ [ styles.label, { color: focused ? theme.colors.primary : theme.custom.colors.textMuted } ] } numberOfLines={ 1 }>
        { label }
      </Text>
    </AnimatedPressable>
  );
};

const AnimatedTabBar = ({ state, descriptors, navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={ [ styles.shell, { paddingBottom: Math.max(insets.bottom, 8) } ] }>
      <BlurView
        intensity={ 55 }
        tint={ theme.custom.colors.glassTint }
        style={ [ styles.container, { backgroundColor: theme.custom.colors.glass, borderColor: theme.custom.colors.border } ] }
      >
        { state.routes.map((route, index) => {
          const { options } = descriptors[ route.key ];
          const isFocused = state.index === index;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={ route.key }
              route={ route }
              focused={ isFocused }
              label={ String(label) }
              options={ options }
              onPress={ onPress }
              onLongPress={ () => navigation.emit({ type: "tabLongPress", target: route.key }) }
            />
          );
        }) }
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 8
  },
  container: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 6
  },
  item: {
    flex: 1,
    minHeight: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600"
  }
});

export default React.memo(AnimatedTabBar);
