import React from "react";
import { Card, Text } from "react-native-paper";

const StatCard = ({ title, value, caption }) => (
  <Card style={{ marginBottom: 12 }}>
    <Card.Content>
      <Text variant="labelLarge">{title}</Text>
      <Text variant="headlineMedium" style={{ marginTop: 6 }}>
        {value}
      </Text>
      {caption ? <Text variant="bodySmall">{caption}</Text> : null}
    </Card.Content>
  </Card>
);

export default StatCard;
