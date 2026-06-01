import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Dialog, Portal, useTheme } from "react-native-paper";
import useAuthStore from "../../store/authStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { formatDateTime, formatPercent, formatTimeOnly } from "../../utils/formatters";
import useUIStore from "../../store/uiStore";
import AnimatedInput from "../../components/AnimatedInput";
import GlassCard from "../../components/GlassCard";
import RemoteImage from "../../components/RemoteImage";
import ScreenContainer from "../../components/ScreenContainer";
import EmptyState from "../../components/EmptyState";
import logRepository from "../../repositories/logRepository";
import { exportReportsPdf } from "../../utils/pdfExport";

const WorkerReportsScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const role = profile?.role || null;

  const fetchReports = useCallback(async (isPullRefresh = false) => {
    if (!user?.uid) {
      setReports([]);
      setLoading(false);
      return;
    }

    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await logRepository.getPage({ role: "operator", uid: user.uid, filters: {}, cursor: null, pageSize: 20 });
      setReports(response.records || []);
      console.info("[WorkerReports] state", { role, reportsLength: (response.records || []).length });
    } catch (error) {
      setReports([]);
      if (error?.code !== "failed-precondition" && error?.code !== "permission-denied") {
        showSnackbar(mapErrorMessage(error), "error");
      }
      console.warn("[WorkerReports] fetch error", { uid: user.uid, role, code: error?.code || "unknown" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, showSnackbar, user?.uid]);

  useFocusEffect(
    React.useCallback(() => {
      fetchReports(false);
    }, [fetchReports])
  );

  const visibleReports = useMemo(() => {
    if (!search.trim()) return reports;
    const s = search.toLowerCase();
    return reports.filter((item) => item.machineName?.toLowerCase().includes(s));
  }, [reports, search]);
  const listBottomPadding = insets.bottom + 104;

  if (!role) return null;

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centerWrap}>
          <Text style={[styles.restrictedText, { color: theme.custom.colors.textMuted }]}>Loading...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (visibleReports.length === 0) {
    return (
      <ScreenContainer>
        <AnimatedInput label="Search by machine" value={search} onChangeText={setSearch} style={styles.search} />
        <View style={styles.centerWrap}>
          <EmptyState text="No reports yet" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={visibleReports}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <AnimatedInput label="Search by machine" value={search} onChangeText={setSearch} style={styles.search} />
            <Button
              mode="contained-tonal"
              icon="file-pdf-box"
              style={styles.exportBtn}
              onPress={async () => {
                try {
                  await exportReportsPdf({ title: "My Efficiency Reports", subtitle: profile?.fullName || "Operator", reports: visibleReports });
                } catch (error) {
                  showSnackbar(mapErrorMessage(error), "error");
                }
              }}
            >
              Export PDF
            </Button>
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReports(true)} />}
        contentContainerStyle={[styles.list, { paddingBottom: listBottomPadding }]}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelectedReport(item)}>
          <GlassCard>
            <View style={styles.row}>
              <RemoteImage uri={item.machineImageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.thumb} />
              <View style={styles.rowContent}>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                  {item.machineName} {item.machineCode ? `(${item.machineCode})` : ""}
                </Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Job: {formatTimeOnly(item.jobStartTime)} - {formatTimeOnly(item.jobEndTime)} | Output: {item.outputProduced}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Downtime: {item.downtime} | Expected: {item.expectedOutput}</Text>
            <Text style={[styles.efficiency, { color: theme.colors.primary }]}>Efficiency: {formatPercent(item.efficiency)}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{formatDateTime(item.timestamp)}</Text>
          </GlassCard>
          </Pressable>
        )}
      />
      <Portal>
        <Dialog visible={Boolean(selectedReport)} onDismiss={() => setSelectedReport(null)} style={styles.dialog}>
          <Dialog.Title>Report Details</Dialog.Title>
          <Dialog.Content>
            {selectedReport ? (
              <View>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>{selectedReport.machineName || "Machine"}</Text>
                <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Date: {formatDateTime(selectedReport.timestamp)}</Text>
                <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Job: {selectedReport.jobName || "-"}</Text>
                <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Start: {formatTimeOnly(selectedReport.jobStartTime)} | End: {formatTimeOnly(selectedReport.jobEndTime)}</Text>
                <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Runtime: {selectedReport.runtimeMinutes || 0} min</Text>
                <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Output: {selectedReport.outputProduced || selectedReport.actualProduction || 0}</Text>
                <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Expected: {selectedReport.expectedProduction || selectedReport.expectedOutput || 0}</Text>
                <Text style={[styles.efficiency, { color: theme.colors.primary }]}>Efficiency: {formatPercent(selectedReport.efficiency)}</Text>
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
  search: {
    marginBottom: 10
  },
  exportBtn: {
    borderRadius: 10,
    marginBottom: 10
  },
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
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  restrictedText: {
    fontSize: 15,
    fontWeight: "500"
  },
  dialog: {
    borderRadius: 14
  }
});

const MACHINE_PLACEHOLDER = require("../../../assets/logo.png");

export default WorkerReportsScreen;
