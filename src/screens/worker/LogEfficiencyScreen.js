import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, Portal, useTheme } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useFocusEffect } from "@react-navigation/native";
import FormTextField from "../../components/FormTextField";
import useAuthStore from "../../store/authStore";
import useUIStore from "../../store/uiStore";
import { getMachines, createEfficiencyLog } from "../../services/firebase/firestore";
import { logSchema } from "../../utils/validationSchemas";
import { mapErrorMessage } from "../../utils/errorMapper";
import { calculateEfficiency, calculateExpectedOutput } from "../../utils/calculations";
import { formatPercent } from "../../utils/formatters";
import GlassCard from "../../components/GlassCard";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import RemoteImage from "../../components/RemoteImage";
import { useCompanyConfig } from "../../context/companyConfig";
import useGeoFence from "../../hooks/useGeoFence";

const LogEfficiencyScreen = () => {
  const { user, profile } = useAuthStore();
  const {
    companyLocation,
    permissionStatus,
    servicesEnabled
  } = useCompanyConfig();
  const {
    isInsideRadius,
    distance,
    loading: geoLoading,
    error: geoError,
    requestLocationAccess,
    refreshLocation,
    openDeviceLocationSettings
  } = useGeoFence();
  const { showSnackbar, online } = useUIStore();
  const theme = useTheme();
  const [machines, setMachines] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, setValue, watch, reset } = useForm({
    resolver: yupResolver(logSchema),
    defaultValues: {
      machineId: "",
      workingHours: "",
      outputProduced: "",
      downtime: "0",
      partName: "",
      operationCode: "",
      cycleTime: "",
      plannedQty: "",
      actualQty: "",
      rejectedQty: "0",
      breakdownReason: ""
    }
  });

  const selectedMachineId = watch("machineId");
  const workingHours = Number(watch("workingHours") || 0);
  const outputProduced = Number(watch("outputProduced") || 0);
  const downtime = Number(watch("downtime") || 0);
  const role = profile?.role === "worker" ? "operator" : profile?.role;

  const loadMachines = React.useCallback(async () => {
    try {
      const data = await getMachines();
      setMachines(data);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  useFocusEffect(
    React.useCallback(() => {
      loadMachines();
    }, [loadMachines])
  );

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
      if (permissionStatus !== "granted") {
        showSnackbar("Grant location permission to submit logs.", "warning");
        return;
      }
      if (!servicesEnabled) {
        showSnackbar("Turn on device location to submit logs.", "warning");
        return;
      }
      if (!isInsideRadius) {
        showSnackbar(`You must be within ${companyLocation.radiusMeters} meters of company to mark attendance`, "error");
        return;
      }
      if (role === "staff") {
        showSnackbar("Staff can only mark attendance.", "warning");
        return;
      }
      setSaving(true);
      await createEfficiencyLog({
        machine: selectedMachine,
        worker: { uid: user.uid, fullName: profile?.fullName || user?.displayName || "Worker" },
        workingHours: values.workingHours,
        outputProduced: values.outputProduced,
        downtime: values.downtime,
        partName: values.partName,
        operationCode: values.operationCode,
        cycleTime: values.cycleTime,
        plannedQty: values.plannedQty,
        actualQty: values.actualQty,
        rejectedQty: values.rejectedQty,
        breakdownReason: values.breakdownReason
      });
      showSnackbar("Efficiency log added", "success");
      reset({
        machineId: "",
        workingHours: "",
        outputProduced: "",
        downtime: "0",
        partName: "",
        operationCode: "",
        cycleTime: "",
        plannedQty: "",
        actualQty: "",
        rejectedQty: "0",
        breakdownReason: ""
      });
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <Button
        mode="outlined"
        onPress={() => {
          if (!isInsideRadius) {
            showSnackbar(`You must be within ${companyLocation.radiusMeters} meters of company to mark attendance`, "warning");
            return;
          }
          setPickerVisible(true);
        }}
        style={styles.machineBtn}
        disabled={!isInsideRadius}
      >
        {selectedMachine ? `Machine: ${selectedMachine.name}` : "Select Machine"}
      </Button>

      {selectedMachine ? (
        <GlassCard style={styles.selectedMachineCard}>
          <View style={styles.machineRow}>
            <RemoteImage uri={selectedMachine.imageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.machineImage} />
            <View style={styles.machineMeta}>
              <Text style={[styles.machineName, { color: theme.colors.onSurface }]}>{selectedMachine.name}</Text>
              <Text style={[styles.machineText, { color: theme.custom.colors.textMuted }]}>Code: {selectedMachine.code}</Text>
              <Text style={[styles.machineText, { color: theme.custom.colors.textMuted }]}>Expected/hour: {selectedMachine.expectedOutputPerHour}</Text>
            </View>
          </View>
        </GlassCard>
      ) : null}

      <FormTextField control={control} name="workingHours" label="Working Hours" keyboardType="numeric" />
      <FormTextField control={control} name="outputProduced" label="Output Produced" keyboardType="numeric" />
      <FormTextField control={control} name="downtime" label="Downtime (Hours)" keyboardType="numeric" />
      <FormTextField control={control} name="partName" label="Part Name" />
      <FormTextField control={control} name="operationCode" label="Operation Code" />
      <FormTextField control={control} name="cycleTime" label="Cycle Time" keyboardType="numeric" />
      <FormTextField control={control} name="plannedQty" label="Planned Qty" keyboardType="numeric" />
      <FormTextField control={control} name="actualQty" label="Actual Qty" keyboardType="numeric" />
      <FormTextField control={control} name="rejectedQty" label="Rejected Qty" keyboardType="numeric" />
      <FormTextField control={control} name="breakdownReason" label="Breakdown Reason" />

      <GlassCard style={styles.statsCard}>
        <Text style={[styles.metricLabel, { color: theme.custom.colors.textMuted }]}>Expected Output</Text>
        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{expectedOutput.toFixed(2)}</Text>
        <Text style={[styles.metricLabel, { color: theme.custom.colors.textMuted, marginTop: 8 }]}>Calculated Efficiency</Text>
        <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{formatPercent(efficiency)}</Text>
      </GlassCard>

      {permissionStatus !== "granted" || !servicesEnabled ? (
        <GlassCard>
          <Text style={[styles.locationTitle, { color: theme.colors.onSurface }]}>Location Required</Text>
          <Text style={[styles.locationHint, { color: theme.custom.colors.textMuted }]}>
            Turn on device location and allow permission to submit production logs.
          </Text>
          <View style={styles.locationActions}>
            <Button mode="contained-tonal" onPress={requestLocationAccess}>
              Enable Permission
            </Button>
            <Button mode="outlined" onPress={openDeviceLocationSettings}>
              Open Settings
            </Button>
          </View>
        </GlassCard>
      ) : null}

      <PrimaryButton
        title="Save Log"
        onPress={handleSubmit(onSubmit)}
        loading={saving}
        disabled={!isInsideRadius || permissionStatus !== "granted" || !servicesEnabled}
      />
      <Text style={[styles.locationHint, { color: theme.custom.colors.textMuted }]}>
        Company zone: {companyLocation.latitude}, {companyLocation.longitude} ({companyLocation.radiusMeters}m)
      </Text>
      <Text style={[styles.locationHint, { color: theme.custom.colors.textMuted }]}>
        {geoLoading
          ? "Checking your location..."
          : distance == null
            ? "Current distance: unavailable"
            : `Current distance: ${Math.round(distance)}m (${isInsideRadius ? "inside" : "outside"})`}
      </Text>
      {geoError ? (
        <Text style={[styles.locationHint, { color: theme.custom.colors.error }]}>Location status: {geoError}</Text>
      ) : null}
      <Button compact mode="text" onPress={refreshLocation}>
        Refresh Location
      </Button>

      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)} style={styles.pickerDialog}>
          <Dialog.Title>Select Machine</Dialog.Title>
          <Dialog.Content>
            <FlatList
              data={machines}
              keyExtractor={(item) => item.id}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.machineOption,
                    {
                      backgroundColor: theme.colors.surface,
                      shadowColor: theme.dark ? "#020617" : "#94A3B8",
                      shadowOpacity: theme.dark ? 0.2 : 0.1
                    }
                  ]}
                  onPress={() => {
                    setValue("machineId", item.id, { shouldValidate: true });
                    setPickerVisible(false);
                  }}
                >
                  <RemoteImage uri={item.imageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.optionImage} />
                  <View style={styles.optionMeta}>
                    <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>{item.name}</Text>
                    <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>{item.code} | {item.expectedOutputPerHour}/hr</Text>
                  </View>
                </Pressable>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickerVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  machineBtn: {
    marginBottom: 12,
    borderRadius: 10
  },
  statsCard: {
    marginTop: 4,
    marginBottom: 8
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: "500"
  },
  metricValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "600"
  },
  selectedMachineCard: {
    marginTop: -4
  },
  machineRow: {
    flexDirection: "row",
    gap: 12
  },
  machineImage: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: "#E2E8F0"
  },
  machineMeta: {
    flex: 1
  },
  machineName: {
    fontSize: 16,
    fontWeight: "600"
  },
  machineText: {
    marginTop: 2,
    fontSize: 13
  },
  pickerDialog: {
    borderRadius: 14
  },
  pickerList: {
    maxHeight: 360
  },
  machineOption: {
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  optionImage: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#E2E8F0"
  },
  optionMeta: {
    flex: 1
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "600"
  },
  optionText: {
    fontSize: 13,
    marginTop: 2
  },
  locationHint: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 6
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6
  },
  locationActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  }
});

const MACHINE_PLACEHOLDER = require("../../../assets/logo.png");

export default LogEfficiencyScreen;
