import React, { useEffect, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { Button, Card, Menu, Text } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import FormTextField from "../../components/FormTextField";
import useAuthStore from "../../store/authStore";
import useUIStore from "../../store/uiStore";
import { getMachines, createEfficiencyLog } from "../../services/firebase/firestore";
import { logSchema } from "../../utils/validationSchemas";
import { mapErrorMessage } from "../../utils/errorMapper";
import { calculateEfficiency, calculateExpectedOutput } from "../../utils/calculations";
import { formatPercent } from "../../utils/formatters";

const LogEfficiencyScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar, online } = useUIStore();
  const [machines, setMachines] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, setValue, watch, reset } = useForm({
    resolver: yupResolver(logSchema),
    defaultValues: {
      machineId: "",
      workingHours: "",
      outputProduced: "",
      downtime: "0"
    }
  });

  const selectedMachineId = watch("machineId");
  const workingHours = Number(watch("workingHours") || 0);
  const outputProduced = Number(watch("outputProduced") || 0);
  const downtime = Number(watch("downtime") || 0);

  useEffect(() => {
    const load = async () => {
      const data = await getMachines();
      setMachines(data);
    };
    load();
  }, []);

  const selectedMachine = useMemo(
    () => machines.find((machine) => machine.id === selectedMachineId),
    [machines, selectedMachineId]
  );

  const expectedOutput = useMemo(() => {
    if (!selectedMachine) return 0;
    return calculateExpectedOutput(selectedMachine.expectedOutputPerHour, workingHours, downtime);
  }, [selectedMachine, workingHours, downtime]);

  const efficiency = useMemo(
    () => calculateEfficiency(outputProduced, expectedOutput),
    [outputProduced, expectedOutput]
  );

  const onSubmit = async (values) => {
    try {
      if (!online) {
        showSnackbar("Cannot submit while offline.", "warning");
        return;
      }
      if (!selectedMachine) {
        showSnackbar("Select machine first", "error");
        return;
      }
      setSaving(true);
      await createEfficiencyLog({
        machine: selectedMachine,
        worker: { uid: user.uid, fullName: profile?.fullName || user?.displayName || "Worker" },
        workingHours: values.workingHours,
        outputProduced: values.outputProduced,
        downtime: values.downtime
      });
      showSnackbar("Efficiency log added", "success");
      reset({ machineId: "", workingHours: "", outputProduced: "", downtime: "0" });
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button mode="outlined" onPress={() => setMenuVisible(true)} style={{ marginBottom: 12 }}>
            {selectedMachine ? selectedMachine.name : "Select Machine"}
          </Button>
        }
      >
        {machines.map((machine) => (
          <Menu.Item
            key={machine.id}
            onPress={() => {
              setValue("machineId", machine.id, { shouldValidate: true });
              setMenuVisible(false);
            }}
            title={`${machine.name} (${machine.code})`}
          />
        ))}
      </Menu>

      <FormTextField control={control} name="workingHours" label="Working Hours" keyboardType="numeric" />
      <FormTextField control={control} name="outputProduced" label="Output Produced" keyboardType="numeric" />
      <FormTextField control={control} name="downtime" label="Downtime (Hours)" keyboardType="numeric" />

      <Card style={{ marginBottom: 12 }}>
        <Card.Content>
          <Text>Expected Output: {expectedOutput.toFixed(2)}</Text>
          <Text>Calculated Efficiency: {formatPercent(efficiency)}</Text>
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={saving}>
        Save Log
      </Button>
    </ScrollView>
  );
};

export default LogEfficiencyScreen;
