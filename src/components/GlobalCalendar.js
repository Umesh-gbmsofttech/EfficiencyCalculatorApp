import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, useTheme } from "react-native-paper";
import GlassCard from "./GlassCard";
import { applyDatePreset } from "../utils/timeRange";

const formatYmd = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const monthDays = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const GlobalCalendar = ({ markedDates = {}, onRangeChange }) => {
  const theme = useTheme();
  const [current, setCurrent] = useState(new Date());

  const days = useMemo(() => {
    const total = monthDays(current);
    const list = [];
    for (let i = 1; i <= total; i += 1) {
      list.push(new Date(current.getFullYear(), current.getMonth(), i));
    }
    return list;
  }, [current]);

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Button compact onPress={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))}>
          Prev
        </Button>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {current.toLocaleString("default", { month: "long" })} {current.getFullYear()}
        </Text>
        <Button compact onPress={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))}>
          Next
        </Button>
      </View>
      <View style={styles.grid}>
        {days.map((d) => {
          const key = formatYmd(d);
          const state = markedDates[key] || "";
          const bg =
            state === "present" ? "rgba(34,197,94,0.2)" : state === "absent" ? "rgba(239,68,68,0.22)" : state === "log" ? "rgba(59,130,246,0.2)" : "transparent";
          return (
            <Pressable
              key={key}
              style={[styles.cell, { backgroundColor: bg, borderColor: theme.custom.colors.border }]}
              onPress={() => onRangeChange?.({ dateFrom: key, dateTo: key })}
            >
              <Text style={[styles.cellText, { color: theme.colors.onSurface }]}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.presetRow}>
        {["day", "week", "month", "year"].map((preset) => (
          <Button
            key={preset}
            compact
            mode="text"
            onPress={() => {
              const range = applyDatePreset(preset);
              onRangeChange?.(range);
            }}
          >
            {preset}
          </Button>
        ))}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  title: { fontSize: 16, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: "13.5%", borderWidth: 1, borderRadius: 8, minHeight: 32, alignItems: "center", justifyContent: "center" },
  cellText: { fontSize: 12, fontWeight: "600" },
  presetRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between" }
});

export default React.memo(GlobalCalendar);
