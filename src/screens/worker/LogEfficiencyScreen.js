import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Button, Dialog, Portal, useTheme } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useFocusEffect } from "@react-navigation/native";
import FormTextField from "../../components/FormTextField";
import useAuthStore from "../../store/authStore";
import useUIStore from "../../store/uiStore";
import { logSchema } from "../../utils/validationSchemas";
import { mapErrorMessage } from "../../utils/errorMapper";
import { calculateReportMetrics } from "../../utils/calculations";
import { formatDateTime, formatPercent, formatTimeOnly } from "../../utils/formatters";
import GlassCard from "../../components/GlassCard";
import ScreenContainer from "../../components/ScreenContainer";
import PrimaryButton from "../../components/PrimaryButton";
import RemoteImage from "../../components/RemoteImage";
import { useCompanyConfig } from "../../context/companyConfig";
import useGeoFence from "../../hooks/useGeoFence";
import { hasAccess } from "../../utils/access";
import machineService from "../../services/firebase/machineService";
import partService from "../../services/firebase/partService";
import logService from "../../services/firebase/logService";
import jobService from "../../services/firebase/jobService";

const LogEfficiencyScreen = () => {
  const { user, profile } = useAuthStore();
  const {
    companyLocation,
    locationRestrictionEnabled,
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
  const [machineParts, setMachineParts] = useState([]);
  const [machineJobs, setMachineJobs] = useState([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [partPickerVisible, setPartPickerVisible] = useState(false);
  const [jobPickerVisible, setJobPickerVisible] = useState(false);
  const [iosTimePickerField, setIosTimePickerField] = useState(null);
  const [iosTimePickerValue, setIosTimePickerValue] = useState(new Date());
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const { control, handleSubmit, setValue, watch, reset } = useForm({
    resolver: yupResolver(logSchema),
    defaultValues: {
      machineId: "",
      partId: "",
      jobId: "",
      jobStartTime: "",
      jobEndTime: "",
      workingHours: "",
      outputProduced: "",
      downtime: "0",
      rejectedQty: "0",
      breakdownReason: ""
    }
  });

  const selectedMachineId = watch("machineId");
  const selectedPartId = watch("partId");
  const selectedJobId = watch("jobId");
  const jobStartTime = watch("jobStartTime");
  const jobEndTime = watch("jobEndTime");
  const outputProduced = Number(watch("outputProduced") || 0);
  const downtime = Number(watch("downtime") || 0);
  const role = profile?.role === "worker" ? "operator" : profile?.role;
  const canSubmitLogs = hasAccess(role, ["operator"]);
  const formatTime = React.useCallback((date) => {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }, []);

  const loadMachines = React.useCallback(async () => {
    try {
      setLoadingMaster(true);
      const machinesData = await machineService.list();
      setMachines(machinesData);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setLoadingMaster(false);
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

  const loadRecentReports = React.useCallback(async () => {
    if (!user?.uid) return;
    try {
      const response = await logService.listPage({ role: "operator", uid: user.uid, filters: {}, cursor: null, pageSize: 5 });
      setRecentReports(response.records || []);
    } catch (error) {
      if (!["failed-precondition", "permission-denied"].includes(String(error?.code || ""))) {
        showSnackbar(mapErrorMessage(error), "error");
      }
    }
  }, [showSnackbar, user?.uid]);

  useFocusEffect(
    React.useCallback(() => {
      loadRecentReports();
    }, [loadRecentReports])
  );

  const selectedMachine = useMemo(
    () => machines.find((machine) => machine.id === selectedMachineId),
    [machines, selectedMachineId]
  );
  const selectedPart = useMemo(() => machineParts.find((part) => part.id === selectedPartId), [machineParts, selectedPartId]);
  const compatibleJobs = useMemo(() => {
    if (!selectedPartId) return [];
    const linked = machineJobs.filter((job) => job.linkedPartId === selectedPartId);
    return linked.length ? linked : machineJobs;
  }, [machineJobs, selectedPartId]);
  const selectedJob = useMemo(() => compatibleJobs.find((job) => job.id === selectedJobId), [compatibleJobs, selectedJobId]);

  useEffect(() => {
    const loadMappedMaster = async () => {
      if (!selectedMachine) {
        setMachineParts([]);
        setMachineJobs([]);
        return;
      }
      setLoadingMaster(true);
      try {
        const hasMappedParts = Array.isArray(selectedMachine.partIds) && selectedMachine.partIds.length > 0;
        const [partsResult, jobsResult] = await Promise.allSettled([
          hasMappedParts ? partService.getByIds(selectedMachine.partIds || []) : partService.list(),
          Array.isArray(selectedMachine.jobIds) && selectedMachine.jobIds.length
            ? jobService.getByIds(selectedMachine.jobIds)
            : jobService.list({ activeOnly: true })
        ]);

        let partsData = [];
        if (partsResult.status === "fulfilled") {
          partsData = partsResult.value || [];
        }
        if (!partsData.length) {
          const fallbackParts = await partService.list();
          partsData = fallbackParts || [];
        }
        setMachineParts(partsData);

        if (jobsResult.status === "fulfilled") {
          setMachineJobs(jobsResult.value || []);
        } else {
          setMachineJobs([]);
        }
      } catch (error) {
        const code = String(error?.code || "");
        if (!code.includes("failed-precondition") && !code.includes("permission-denied")) {
          showSnackbar(mapErrorMessage(error), "error");
        }
      } finally {
        setLoadingMaster(false);
      }
    };
    loadMappedMaster();
  }, [selectedMachine, showSnackbar]);

  useEffect(() => {
    if (!selectedMachineId) return;
    if (machineParts.length === 1 && !selectedPartId) {
      setValue("partId", machineParts[0].id, { shouldValidate: true });
    }
    if (selectedPartId && !machineParts.some((item) => item.id === selectedPartId)) {
      setValue("partId", "", { shouldValidate: false });
      setValue("jobId", "", { shouldValidate: false });
    }
    if (selectedPartId && selectedJobId && !compatibleJobs.some((item) => item.id === selectedJobId)) {
      setValue("jobId", "", { shouldValidate: false });
    }
  }, [compatibleJobs, machineParts, selectedMachineId, selectedPartId, selectedJobId, setValue]);

  const buildJobDate = React.useCallback((timeText) => {
    const match = String(timeText || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const date = new Date();
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date;
  }, []);
  const getPickerDate = React.useCallback((timeText) => buildJobDate(timeText) || new Date(), [buildJobDate]);
  const openTimePicker = React.useCallback((fieldName) => {
    const current = getPickerDate(fieldName === "jobStartTime" ? jobStartTime : jobEndTime);
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: current,
        mode: "time",
        display: "clock",
        is24Hour: true,
        onChange: (event, selectedDate) => {
          if (event.type !== "set" || !selectedDate) return;
          setValue(fieldName, formatTime(selectedDate), { shouldValidate: true, shouldDirty: true });
        }
      });
      return;
    }
    setIosTimePickerField(fieldName);
    setIosTimePickerValue(current);
  }, [formatTime, getPickerDate, jobEndTime, jobStartTime, setValue]);

  const reportMetrics = useMemo(() => {
    if (!selectedMachine) return 0;
    const start = buildJobDate(jobStartTime);
    const end = buildJobDate(jobEndTime);
    const normalizedEnd = start && end && end < start ? new Date(end.getTime() + 24 * 60 * 60000) : end;
    return calculateReportMetrics({
      machine: selectedMachine,
      jobStartTime: start,
      jobEndTime: normalizedEnd,
      downtime,
      outputProduced
    });
  }, [buildJobDate, downtime, jobEndTime, jobStartTime, outputProduced, selectedMachine]);
  const expectedOutput = reportMetrics?.expectedOutput || 0;
  const efficiency = reportMetrics?.efficiency || 0;

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
      if (locationRestrictionEnabled && permissionStatus !== "granted") {
        showSnackbar("Grant location permission to submit reports.", "warning");
        return;
      }
      if (locationRestrictionEnabled && !servicesEnabled) {
        showSnackbar("Turn on device location to submit reports.", "warning");
        return;
      }
      if (locationRestrictionEnabled && !isInsideRadius) {
        showSnackbar(`You must be within ${companyLocation.radiusMeters} meters of company to mark attendance`, "error");
        return;
      }
      if (!selectedPart) {
        showSnackbar("Select part before submitting report.", "warning");
        return;
      }
      setSaving(true);
      await logService.create({
        machine: selectedMachine,
        part: selectedPart,
        job: selectedJob || null,
        actorRole: role,
        worker: { uid: user.uid, fullName: profile?.fullName || user?.displayName || "Worker" },
        workingHours: reportMetrics.runtimeMinutes / 60,
        jobStartTime: buildJobDate(values.jobStartTime),
        jobEndTime: (() => {
          const start = buildJobDate(values.jobStartTime);
          const end = buildJobDate(values.jobEndTime);
          return start && end && end < start ? new Date(end.getTime() + 24 * 60 * 60000) : end;
        })(),
        outputProduced: values.outputProduced,
        downtime: values.downtime,
        partName: selectedPart.partName,
        operationCode: selectedPart.operationCode,
        cycleTime: selectedMachine.cycleTimeMinutes || selectedPart.cycleTime,
        plannedQty: expectedOutput,
        actualQty: values.outputProduced,
        rejectedQty: values.rejectedQty,
        breakdownReason: values.breakdownReason
      });
      showSnackbar("Efficiency report added", "success");
      await loadRecentReports();
      reset({
        machineId: "",
        partId: "",
        jobId: "",
        jobStartTime: "",
        jobEndTime: "",
        workingHours: "",
        outputProduced: "",
        downtime: "0",
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
        disabled={(locationRestrictionEnabled && !isInsideRadius) || !canSubmitLogs}
      >
        {selectedMachine ? `Machine: ${selectedMachine.name}` : "Select Machine"}
      </Button>
      <Button
        mode="outlined"
        onPress={() => setPartPickerVisible(true)}
        style={styles.machineBtn}
        disabled={!selectedMachineId || loadingMaster}
      >
        {selectedPart ? `Part: ${selectedPart.partName}` : "Select Part"}
      </Button>
      <Button
        mode="outlined"
        onPress={() => setJobPickerVisible(true)}
        style={styles.machineBtn}
        disabled={!selectedPartId || loadingMaster}
      >
        {selectedJob ? `Job: ${selectedJob.jobName}` : "Job (Optional)"}
      </Button>
      {!selectedMachineId ? <Text style={[styles.locationHint, { color: theme.custom.colors.textMuted }]}>Select machine first.</Text> : null}
      {selectedMachineId && !machineParts.length ? <Text style={[styles.locationHint, { color: theme.custom.colors.error }]}>No compatible parts found.</Text> : null}
      {selectedPartId && !compatibleJobs.length ? <Text style={[styles.locationHint, { color: theme.custom.colors.error }]}>No compatible jobs found.</Text> : null}

      {selectedMachine ? (
        <GlassCard style={styles.selectedMachineCard}>
          <View style={styles.machineRow}>
            <RemoteImage uri={selectedMachine.imageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.machineImage} />
            <View style={styles.machineMeta}>
              <Text style={[styles.machineName, { color: theme.colors.onSurface }]}>{selectedMachine.name}</Text>
              <Text style={[styles.machineText, { color: theme.custom.colors.textMuted }]}>Code: {selectedMachine.code}</Text>
              <Text style={[styles.machineText, { color: theme.custom.colors.textMuted }]}>Cycle time: {selectedMachine.cycleTimeMinutes} min</Text>
            </View>
          </View>
        </GlassCard>
      ) : null}

      <View style={styles.timeRow}>
        <View style={styles.timeCol}>
          <Button mode="outlined" icon="clock-start" style={styles.timeBtn} onPress={() => openTimePicker("jobStartTime")}>
            {jobStartTime ? `Start ${jobStartTime}` : "Job Start"}
          </Button>
        </View>
        <View style={styles.timeCol}>
          <Button mode="outlined" icon="clock-end" style={styles.timeBtn} onPress={() => openTimePicker("jobEndTime")}>
            {jobEndTime ? `End ${jobEndTime}` : "Job End"}
          </Button>
        </View>
      </View>
      <Text style={[styles.locationHint, { color: theme.custom.colors.textMuted }]}>
        Runtime: {Number(reportMetrics?.runtimeMinutes || 0).toFixed(0)} minutes
      </Text>
      <FormTextField control={control} name="outputProduced" label="Output Produced" keyboardType="numeric" />
      <FormTextField control={control} name="downtime" label="Downtime (Hours)" keyboardType="numeric" />
      <FormTextField control={control} name="rejectedQty" label="Rejected Qty" keyboardType="numeric" />
      <FormTextField control={control} name="breakdownReason" label="Breakdown Reason" />

      <GlassCard style={styles.statsCard}>
        <Text style={[styles.metricLabel, { color: theme.custom.colors.textMuted }]}>Expected Output</Text>
        <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{expectedOutput.toFixed(2)}</Text>
        <Text style={[styles.metricLabel, { color: theme.custom.colors.textMuted, marginTop: 8 }]}>Calculated Efficiency</Text>
        <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{formatPercent(efficiency)}</Text>
      </GlassCard>

      {locationRestrictionEnabled && (permissionStatus !== "granted" || !servicesEnabled) ? (
        <GlassCard>
          <Text style={[styles.locationTitle, { color: theme.colors.onSurface }]}>Location Required</Text>
          <Text style={[styles.locationHint, { color: theme.custom.colors.textMuted }]}>
            Turn on device location and allow permission to submit production reports.
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
        title="Save Report"
        onPress={handleSubmit(onSubmit)}
        loading={saving}
        disabled={(locationRestrictionEnabled && (!isInsideRadius || permissionStatus !== "granted" || !servicesEnabled)) || !canSubmitLogs}
      />
      <GlassCard style={styles.recentCard}>
        <View style={styles.recentHeader}>
          <Text style={[styles.locationTitle, { color: theme.colors.onSurface }]}>Recent Reports</Text>
          <Button compact mode="text" onPress={loadRecentReports}>Refresh</Button>
        </View>
        {recentReports.length ? (
          recentReports.map((item) => (
            <Pressable key={item.id} style={styles.recentRow} onPress={() => setSelectedReport(item)}>
              <RemoteImage uri={item.machineImageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.recentThumb} />
              <View style={styles.optionMeta}>
                <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>{item.machineName || "Machine"}</Text>
                <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>
                  {formatTimeOnly(item.jobStartTime)} - {formatTimeOnly(item.jobEndTime)} | {formatPercent(item.efficiency)}
                </Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={[styles.locationHint, { color: theme.custom.colors.textMuted }]}>No reports yet.</Text>
        )}
      </GlassCard>
      {locationRestrictionEnabled ? (
        <>
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
        </>
      ) : null}

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
                    setValue("partId", "", { shouldValidate: false });
                    setValue("jobId", "", { shouldValidate: false });
                    setMachineParts([]);
                    setMachineJobs([]);
                    setPickerVisible(false);
                  }}
                >
                  <RemoteImage uri={item.imageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.optionImage} />
                  <View style={styles.optionMeta}>
                    <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>{item.name}</Text>
                    <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>{item.code} | CT {item.cycleTimeMinutes} min</Text>
                  </View>
                </Pressable>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickerVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={partPickerVisible} onDismiss={() => setPartPickerVisible(false)} style={styles.pickerDialog}>
          <Dialog.Title>Select Part</Dialog.Title>
          <Dialog.Content>
            <FlatList
              data={machineParts}
              keyExtractor={(item) => item.id}
              style={styles.pickerList}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.machineOption, { backgroundColor: theme.colors.surface }]}
                  onPress={() => {
                    setValue("partId", item.id, { shouldValidate: true });
                    setValue("jobId", "", { shouldValidate: false });
                    setPartPickerVisible(false);
                  }}
                >
                  <View style={styles.optionMeta}>
                    <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>{item.partName}</Text>
                    <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>
                      {item.operationCode} | {item.partNumber}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPartPickerVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={jobPickerVisible} onDismiss={() => setJobPickerVisible(false)} style={styles.pickerDialog}>
          <Dialog.Title>Select Job</Dialog.Title>
          <Dialog.Content>
            <FlatList
              data={compatibleJobs}
              keyExtractor={(item) => item.id}
              style={styles.pickerList}
              ListEmptyComponent={<Text style={{ color: theme.custom.colors.textMuted }}>No compatible jobs found.</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.machineOption, { backgroundColor: theme.colors.surface }]}
                  onPress={() => {
                    setValue("jobId", item.id, { shouldValidate: true });
                    setJobPickerVisible(false);
                  }}
                >
                  <View style={styles.optionMeta}>
                    <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>{item.jobName}</Text>
                    <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>
                      {item.jobCode || "-"} | CT: {item.estimatedCycleTime || 0}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setJobPickerVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={Boolean(iosTimePickerField)} onDismiss={() => setIosTimePickerField(null)} style={styles.pickerDialog}>
          <Dialog.Title>{iosTimePickerField === "jobStartTime" ? "Job Start" : "Job End"}</Dialog.Title>
          <Dialog.Content>
            {iosTimePickerField ? (
              <DateTimePicker
                value={iosTimePickerValue}
                mode="time"
                display="spinner"
                is24Hour
                onChange={(_, selectedDate) => {
                  if (selectedDate) setIosTimePickerValue(selectedDate);
                }}
              />
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIosTimePickerField(null)}>Cancel</Button>
            <Button
              onPress={() => {
                if (iosTimePickerField) {
                  setValue(iosTimePickerField, formatTime(iosTimePickerValue), { shouldValidate: true, shouldDirty: true });
                }
                setIosTimePickerField(null);
              }}
            >
              Done
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={Boolean(selectedReport)} onDismiss={() => setSelectedReport(null)} style={styles.pickerDialog}>
          <Dialog.Title>Report Details</Dialog.Title>
          <Dialog.Content>
            {selectedReport ? (
              <View>
                <Text style={[styles.optionTitle, { color: theme.colors.onSurface }]}>{selectedReport.machineName || "Machine"}</Text>
                <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>Date: {formatDateTime(selectedReport.timestamp)}</Text>
                <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>Job: {selectedReport.jobName || "-"}</Text>
                <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>Start: {formatTimeOnly(selectedReport.jobStartTime)} | End: {formatTimeOnly(selectedReport.jobEndTime)}</Text>
                <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>Runtime: {selectedReport.runtimeMinutes || 0} min</Text>
                <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>Output: {selectedReport.outputProduced || selectedReport.actualProduction || 0}</Text>
                <Text style={[styles.optionText, { color: theme.custom.colors.textMuted }]}>Expected: {selectedReport.expectedProduction || selectedReport.expectedOutput || 0}</Text>
                <Text style={[styles.optionText, { color: theme.colors.primary }]}>Efficiency: {formatPercent(selectedReport.efficiency)}</Text>
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelectedReport(null)}>Close</Button>
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
  },
  timeRow: {
    flexDirection: "row",
    gap: 10
  },
  timeCol: {
    flex: 1
  },
  timeBtn: {
    borderRadius: 10,
    marginBottom: 4
  },
  recentCard: {
    marginTop: 10
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8
  },
  recentThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#E2E8F0"
  }
});

const MACHINE_PLACEHOLDER = require("../../../assets/logo.png");

export default LogEfficiencyScreen;
