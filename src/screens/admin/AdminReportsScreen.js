import React, { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Dialog, Portal, useTheme } from "react-native-paper";
import ReportFilters from "../../components/ReportFilters";
import EmptyState from "../../components/EmptyState";
import GlassCard from "../../components/GlassCard";
import RemoteImage from "../../components/RemoteImage";
import ScreenContainer from "../../components/ScreenContainer";
import useAuthStore from "../../store/authStore";
import AnimatedInput from "../../components/AnimatedInput";
import usePaginatedLogs from "../../hooks/usePaginatedLogs";
import { formatDateTime, formatPercent, formatTimeOnly } from "../../utils/formatters";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { calculateReportMetrics } from "../../utils/calculations";
import { applyDatePreset } from "../../utils/timeRange";
import { hasAccess } from "../../utils/access";
import machineService from "../../services/firebase/machineService";
import userService from "../../services/firebase/userService";
import logService from "../../services/firebase/logService";
import { logInfo } from "../../utils/logger";
import { exportReportsPdf } from "../../utils/pdfExport";

const AdminReportsScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [workerMenu, setWorkerMenu] = useState(false);
  const [machineMenu, setMachineMenu] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    workerId: "",
    machineId: "",
    ...applyDatePreset("day")
  });
  const [editVisible, setEditVisible] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [editForm, setEditForm] = useState({
    workingHours: "",
    outputProduced: "",
    downtime: "",
    partName: "",
    operationCode: "",
    cycleTime: "",
    plannedQty: "",
    actualQty: "",
    rejectedQty: "",
    breakdownReason: ""
  });
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
        const [workerData, machineData] = await Promise.all([userService.list({ role: "admin" }), machineService.list()]);
        setWorkers(workerData);
        setMachines(machineData);
      } catch (error) {
        showSnackbar(mapErrorMessage(error), "error");
      }
    };
    loadFilterData();
  }, [showSnackbar]);

  const visibleRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const search = filters.search.toLowerCase();
    return records.filter(
      (item) =>
        item.workerName?.toLowerCase().includes(search) ||
        item.machineName?.toLowerCase().includes(search)
    );
  }, [records, filters.search]);
  const listBottomPadding = insets.bottom + 104;

  logInfo("AdminReports", "state", { role: role || "none", reportsLength: visibleRecords.length });

  if (!role) return null;
  if (!hasAccess(role, ["admin"])) return null;

  const onOpenEdit = (item) => {
    setEditingLog(item);
    setEditForm({
      workingHours: String(item.workingHours ?? ""),
      outputProduced: String(item.outputProduced ?? ""),
      downtime: String(item.downtime ?? 0),
      partName: String(item.partName ?? ""),
      operationCode: String(item.operationCode ?? ""),
      cycleTime: String(item.cycleTime ?? ""),
      plannedQty: String(item.plannedQty ?? ""),
      actualQty: String(item.actualQty ?? item.outputProduced ?? ""),
      rejectedQty: String(item.rejectedQty ?? 0),
      breakdownReason: String(item.breakdownReason ?? "")
    });
    setEditVisible(true);
  };

  const onSaveEdit = async () => {
    if (!editingLog) return;
    try {
      const workingHours = Number(editForm.workingHours);
      const outputProduced = Number(editForm.outputProduced);
      const downtime = Number(editForm.downtime);
      const cycleTime = Number(editForm.cycleTime || 0);
      const plannedQty = Number(editForm.plannedQty || 0);
      const actualQty = Number(editForm.actualQty || outputProduced);
      const rejectedQty = Number(editForm.rejectedQty || 0);
      if (Number.isNaN(workingHours) || Number.isNaN(outputProduced) || Number.isNaN(downtime)) {
        showSnackbar("Enter valid numeric values.", "warning");
        return;
      }
      if (workingHours <= 0 || outputProduced < 0 || downtime < 0) {
        showSnackbar("Hours must be positive and output/downtime cannot be negative.", "warning");
        return;
      }
      const machine = machines.find((m) => m.id === editingLog.machineId) || editingLog;
      const metrics = calculateReportMetrics({
        machine,
        workingHours,
        downtime,
        outputProduced,
        actualQty,
        cycleTimeMinutes: Number(editForm.cycleTime || machine.cycleTimeMinutes || editingLog.cycleTimeMinutes || 0)
      });
      setEditSaving(true);
      await logService.update(editingLog.id, {
        workingHours,
        outputProduced,
        downtime,
        machineDowntime: downtime,
        ...metrics,
        partName: editForm.partName,
        operationCode: editForm.operationCode,
        cycleTime,
        plannedQty,
        actualQty,
        rejectedQty,
        breakdownReason: editForm.breakdownReason
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
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <>
            <ReportFilters
              workers={workers}
              machines={machines}
              filters={filters}
              workerMenu={workerMenu}
              setWorkerMenu={setWorkerMenu}
              machineMenu={machineMenu}
              setMachineMenu={setMachineMenu}
              onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
              onRangeChange={(next) => setFilters((prev) => ({ ...prev, dateFrom: next.dateFrom, dateTo: next.dateTo }))}
            />
            <Button
              mode="contained-tonal"
              icon="file-pdf-box"
              style={styles.exportBtn}
              onPress={async () => {
                try {
                  await exportReportsPdf({ title: "Efficiency Calculator Reports", subtitle: "Filtered production reports", reports: visibleRecords });
                } catch (error) {
                  showSnackbar(mapErrorMessage(error), "error");
                }
              }}
            >
              Export PDF
            </Button>
          </>
        }
        ListEmptyComponent={loading ? null : <EmptyState text="No reports yet" />}
        contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
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
              Job: {formatTimeOnly(item.jobStartTime)} - {formatTimeOnly(item.jobEndTime)} | Output: {item.outputProduced}
            </Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>
              Downtime: {item.downtime} | Expected: {item.expectedOutput}
            </Text>
            <Text style={[styles.efficiency, { color: theme.colors.primary }]}>Efficiency: {formatPercent(item.efficiency)}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{formatDateTime(item.timestamp)}</Text>
            <View style={styles.editActionWrap}>
              <Button mode="contained-tonal" onPress={() => onOpenEdit(item)} style={styles.editBtn}>
                Edit
              </Button>
              <Button
                mode="outlined"
                textColor={theme.custom.colors.error}
                style={styles.editBtn}
                onPress={async () => {
                  await logService.remove(item.id);
                  showSnackbar("Report deleted", "success");
                  await refresh();
                }}
              >
                Delete
              </Button>
            </View>
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
            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
              <AnimatedInput
              label="Runtime Hours"
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
            <AnimatedInput
              label="Part Name"
              value={editForm.partName}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, partName: value }))}
              style={styles.field}
            />
            <AnimatedInput
              label="Operation Code"
              value={editForm.operationCode}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, operationCode: value }))}
              style={styles.field}
            />
            <AnimatedInput
              label="Cycle Time (Minutes)"
              keyboardType="numeric"
              value={editForm.cycleTime}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, cycleTime: value }))}
              style={styles.field}
            />
            <AnimatedInput
              label="Planned Qty"
              keyboardType="numeric"
              value={editForm.plannedQty}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, plannedQty: value }))}
              style={styles.field}
            />
            <AnimatedInput
              label="Actual Qty"
              keyboardType="numeric"
              value={editForm.actualQty}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, actualQty: value }))}
              style={styles.field}
            />
            <AnimatedInput
              label="Rejected Qty"
              keyboardType="numeric"
              value={editForm.rejectedQty}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, rejectedQty: value }))}
              style={styles.field}
            />
              <AnimatedInput
              label="Breakdown Reason"
              value={editForm.breakdownReason}
              onChangeText={(value) => setEditForm((prev) => ({ ...prev, breakdownReason: value }))}
              />
            </ScrollView>
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
    paddingBottom: 24
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
  exportBtn: {
    borderRadius: 10,
    marginBottom: 10
  },
  footerSpace: {
    height: 12
  },
  editActionWrap: {
    marginTop: 8,
    flexDirection: "column"
  },
  editBtn: {
    borderRadius: 10,
    width: "100%",
    marginTop: 10
  },
  dialog: {
    borderRadius: 14
  },
  field: {
    marginBottom: 8
  },
  formScroll: {
    paddingBottom: 8
  }
});

const MACHINE_PLACEHOLDER = require("../../../assets/logo.png");

export default AdminReportsScreen;
