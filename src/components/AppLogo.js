import React from "react";
import { Image, View } from "react-native";

const AppLogo = ({ size = 120 }) => (
  <View style={{ alignItems: "center", marginVertical: 12 }}>
    <Image source={require("../../assets/logo.png")} style={{ width: size, height: size }} resizeMode="contain" />
  </View>
);

export default AppLogo;
