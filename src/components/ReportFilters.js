import React from "react";
import { View } from "react-native";
import { Menu, Button, TextInput } from "react-native-paper";

const ReportFilters = ({
  workers,
  machines,
  filters,
  onChange,
  workerMenu,
  setWorkerMenu,
  machineMenu,
  setMachineMenu
}) => (
  <View style={{ marginBottom: 12 }}>
    <TextInput
      label="Search"
      mode="outlined"
      value={filters.search}
      onChangeText={(v) => onChange("search", v)}
      style={{ marginBottom: 8 }}
    />

    <Menu
      visible={workerMenu}
      onDismiss={() => setWorkerMenu(false)}
      anchor={
        <Button mode="outlined" onPress={() => setWorkerMenu(true)} style={{ marginBottom: 8 }}>
          {filters.workerId ? workers.find((w) => w.id === filters.workerId)?.fullName || "Worker" : "All Workers"}
        </Button>
      }
    >
      <Menu.Item onPress={() => { onChange("workerId", ""); setWorkerMenu(false); }} title="All Workers" />
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

    <Menu
      visible={machineMenu}
      onDismiss={() => setMachineMenu(false)}
      anchor={
        <Button mode="outlined" onPress={() => setMachineMenu(true)} style={{ marginBottom: 8 }}>
          {filters.machineId ? machines.find((m) => m.id === filters.machineId)?.name || "Machine" : "All Machines"}
        </Button>
      }
    >
      <Menu.Item onPress={() => { onChange("machineId", ""); setMachineMenu(false); }} title="All Machines" />
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

    <TextInput
      label="Date From (YYYY-MM-DD)"
      mode="outlined"
      value={filters.dateFrom}
      onChangeText={(v) => onChange("dateFrom", v)}
      style={{ marginBottom: 8 }}
    />
    <TextInput
      label="Date To (YYYY-MM-DD)"
      mode="outlined"
      value={filters.dateTo}
      onChangeText={(v) => onChange("dateTo", v)}
    />
  </View>
);

export default ReportFilters;
