import React, { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, Portal, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import ReportFilters from "../../components/ReportFilters";
import EmptyState from "../../components/EmptyState";
import GlassCard from "../../components/GlassCard";
import RemoteImage from "../../components/RemoteImage";
import ScreenContainer from "../../components/ScreenContainer";
import useAuthStore from "../../store/authStore";
import AnimatedInput from "../../components/AnimatedInput";
import { getMachines, getWorkers, updateEfficiencyLog } from "../../services/firebase/firestore";
import usePaginatedLogs from "../../hooks/usePaginatedLogs";
import { formatDateTime, formatPercent } from "../../utils/formatters";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { calculateEfficiency, calculateExpectedOutput } from "../../utils/calculations";

const AdminReportsScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [workerMenu, setWorkerMenu] = useState(false);
  const [machineMenu, setMachineMenu] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    workerId: "",
    machineId: "",
    dateFrom: "",
    dateTo: ""
  });
  const [editVisible, setEditVisible] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({
    workingHours: "",
    outputProduced: "",
    downtime: ""
  });
  const isAdmin = profile?.role === "admin";
  const role = profile?.role || null;

  const { records, loading, refreshing, hasMore, loadMore, refresh } = usePaginatedLogs({
    role: "admin",
    uid: user?.uid,
    filters,
    enabled: Boolean(user?.uid)
  });

  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [workerData, machineData] = await Promise.all([getWorkers(), getMachines()]);
        setWorkers(workerData);
        setMachines(machineData);
      } catch (error) {
        showSnackbar(mapErrorMessage(error), "error");
      }
    };
    loadFilterData();
  }, [showSnackbar]);

  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh])
  );

  const visibleRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const search = filters.search.toLowerCase();
    return records.filter(
      (item) =>
        item.workerName?.toLowerCase().includes(search) ||
        item.machineName?.toLowerCase().includes(search)
    );
  }, [records, filters.search]);

  console.info("[AdminReports] state", { role: role || "none", reportsLength: visibleRecords.length });

  if (!role) return null;

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.restrictedWrap}>
          <Text style={[styles.restrictedText, { color: theme.custom.colors.textMuted }]}>Access restricted</Text>
        </View>
      </ScreenContainer>
    );
  }

  const onOpenEdit = (item) => {
    setEditingLog(item);
    setEditForm({
      workingHours: String(item.workingHours ?? ""),
      outputProduced: String(item.outputProduced ?? ""),
      downtime: String(item.downtime ?? 0)
    });
    setEditVisible(true);
  };

  const onSaveEdit = async () => {
    if (!editingLog) return;
    try {
      const workingHours = Number(editForm.workingHours);
      const outputProduced = Number(editForm.outputProduced);
      const downtime = Number(editForm.downtime);
      if (Number.isNaN(workingHours) || Number.isNaN(outputProduced) || Number.isNaN(downtime)) {
        showSnackbar("Enter valid numeric values.", "warning");
        return;
      }
      if (workingHours <= 0 || outputProduced < 0 || downtime < 0) {
        showSnackbar("Hours must be positive and output/downtime cannot be negative.", "warning");
        return;
      }
      const machine = machines.find((m) => m.id === editingLog.machineId);
      const productiveHours = Math.max(0, workingHours - downtime);
      const fallbackRate = productiveHours > 0 ? Number(editingLog.expectedOutput || 0) / productiveHours : 0;
      const expectedPerHour = Number(machine?.expectedOutputPerHour ?? fallbackRate);
      const expectedOutput = calculateExpectedOutput(expectedPerHour, workingHours, downtime);
      const efficiency = calculateEfficiency(outputProduced, expectedOutput);
      setEditSaving(true);
      await updateEfficiencyLog(editingLog.id, {
        workingHours,
        outputProduced,
        downtime,
        expectedOutput,
        efficiency
      });
      showSnackbar("Report updated", "success");
      setEditVisible(false);
      setEditingLog(null);
      await refresh();
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <FlatList
        data={visibleRecords}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ReportFilters
            workers={workers}
            machines={machines}
            filters={filters}
            workerMenu={workerMenu}
            setWorkerMenu={setWorkerMenu}
            machineMenu={machineMenu}
            setMachineMenu={setMachineMenu}
            onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          />
        }
        ListEmptyComponent={loading ? null : <EmptyState text="No reports found." />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <GlassCard>
            <View style={styles.row}>
              <RemoteImage uri={item.machineImageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.thumb} />
              <View style={styles.rowContent}>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.workerName}</Text>
                <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>
                  Machine: {item.machineName} {item.machineCode ? `(${item.machineCode})` : ""}
                </Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>
              Hours: {item.workingHours} | Output: {item.outputProduced}
            </Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>
              Downtime: {item.downtime} | Expected: {item.expectedOutput}
            </Text>
            <Text style={[styles.efficiency, { color: theme.colors.primary }]}>Efficiency: {formatPercent(item.efficiency)}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{formatDateTime(item.timestamp)}</Text>
            {isAdmin ? (
              <View style={styles.editActionWrap}>
                <Button mode="contained-tonal" onPress={() => onOpenEdit(item)} style={styles.editBtn}>
                  Edit
                </Button>
              </View>
            ) : null}
          </GlassCard>
        )}
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerWrap}>
              <Button mode="contained-tonal" loading={loading} onPress={loadMore} style={styles.loadBtn}>
                Load More
              </Button>
            </View>
          ) : (
            <View style={styles.footerSpace} />
          )
        }
      />
      <Portal>
        <Dialog visible={editVisible} onDismiss={() => setEditVisible(false)} style={styles.dialog}>
          <Dialog.Title>Edit Report</Dialog.Title>
          <Dialog.Content>
            <AnimatedInput
              label="Working Hours"
              keyboardType="numeric"
              value={editForm.workingHours}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, workingHours: value }))}
              style={styles.field}
            />
            <AnimatedInput
              label="Output Produced"
              keyboardType="numeric"
              value={editForm.outputProduced}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, outputProduced: value }))}
              style={styles.field}
            />
            <AnimatedInput
              label="Downtime (Hours)"
              keyboardType="numeric"
              value={editForm.downtime}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, downtime: value }))}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditVisible(false)}>Cancel</Button>
            <Button onPress={onSaveEdit} loading={editSaving} disabled={editSaving}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  list: {
    paddingBottom: 120
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4
  },
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4
  },
  rowContent: {
    flex: 1
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#E2E8F0"
  },
  meta: {
    fontSize: 14,
    marginBottom: 2
  },
  efficiency: {
    marginTop: 4,
    marginBottom: 2,
    fontSize: 15,
    fontWeight: "600"
  },
  footerWrap: {
    paddingBottom: 8
  },
  loadBtn: {
    borderRadius: 10
  },
  footerSpace: {
    height: 12
  },
  editActionWrap: {
    marginTop: 8,
    alignItems: "flex-start"
  },
  editBtn: {
    borderRadius: 10
  },
  dialog: {
    borderRadius: 14
  },
  field: {
    marginBottom: 8
  },
  restrictedWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  restrictedText: {
    fontSize: 15,
    fontWeight: "500"
  }
});

const MACHINE_PLACEHOLDER = require("../../../assets/logo.png");

export default AdminReportsScreen;
