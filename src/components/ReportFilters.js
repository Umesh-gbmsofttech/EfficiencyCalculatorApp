import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Menu, useTheme } from "react-native-paper";
import AnimatedInput from "./AnimatedInput";
import GlassCard from "./GlassCard";

const ReportFilters = ({
  workers,
  machines,
  filters,
  onChange,
  workerMenu,
  setWorkerMenu,
  machineMenu,
  setMachineMenu
}) => {
  const theme = useTheme();
  return (
    <GlassCard style={styles.card}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>Filters</Text>
      <AnimatedInput
        label="Search worker or machine"
        value={filters.search}
        onChangeText={(v) => onChange("search", v)}
        style={styles.gap}
      />

      <View style={styles.gap}>
        <Menu
          visible={workerMenu}
          onDismiss={() => setWorkerMenu(false)}
          anchor={
            <Button mode="outlined" onPress={() => setWorkerMenu(true)} style={styles.menuBtn}>
              {filters.workerId ? workers.find((w) => w.id === filters.workerId)?.fullName || "Worker" : "All Workers"}
            </Button>
          }
        >
          <Menu.Item
            onPress={() => {
              onChange("workerId", "");
              setWorkerMenu(false);
            }}
            title="All Workers"
          />
          {workers.map((worker) => (
            <Menu.Item
              key={worker.id}
              onPress={() => {
                onChange("workerId", worker.id);
                setWorkerMenu(false);
              }}
              title={worker.fullName}
            />
          ))}
        </Menu>
      </View>

      <View style={styles.gap}>
        <Menu
          visible={machineMenu}
          onDismiss={() => setMachineMenu(false)}
          anchor={
            <Button mode="outlined" onPress={() => setMachineMenu(true)} style={styles.menuBtn}>
              {filters.machineId ? machines.find((m) => m.id === filters.machineId)?.name || "Machine" : "All Machines"}
            </Button>
          }
        >
          <Menu.Item
            onPress={() => {
              onChange("machineId", "");
              setMachineMenu(false);
            }}
            title="All Machines"
          />
          {machines.map((machine) => (
            <Menu.Item
              key={machine.id}
              onPress={() => {
                onChange("machineId", machine.id);
                setMachineMenu(false);
              }}
              title={machine.name}
            />
          ))}
        </Menu>
      </View>

      <AnimatedInput
        label="Date From (YYYY-MM-DD)"
        value={filters.dateFrom}
        onChangeText={(v) => onChange("dateFrom", v)}
        style={styles.gap}
      />
      <AnimatedInput
        label="Date To (YYYY-MM-DD)"
        value={filters.dateTo}
        onChangeText={(v) => onChange("dateTo", v)}
      />
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 10
  },
  gap: {
    marginBottom: 8
  },
  menuBtn: {
    borderRadius: 10
  }
});

export default React.memo(ReportFilters);
