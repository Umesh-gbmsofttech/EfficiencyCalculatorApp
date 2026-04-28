import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import useAuthStore from "../../store/authStore";
import { getLogsPage } from "../../services/firebase/firestore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { formatDateTime, formatPercent } from "../../utils/formatters";
import useUIStore from "../../store/uiStore";
import AnimatedInput from "../../components/AnimatedInput";
import GlassCard from "../../components/GlassCard";
import RemoteImage from "../../components/RemoteImage";
import ScreenContainer from "../../components/ScreenContainer";

const WorkerReportsScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState([]);

  const role = profile?.role || null;
  const isAdmin = role === "admin";

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
      const response = await getLogsPage({ role: "operator", uid: user.uid, filters: {}, cursor: null, pageSize: 50 });
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

  if (!role) return null;

  if (isAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.centerWrap}>
          <Text style={[styles.restrictedText, { color: theme.custom.colors.textMuted }]}>Access restricted</Text>
        </View>
      </ScreenContainer>
    );
  }

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
          <Text style={[styles.restrictedText, { color: theme.custom.colors.textMuted }]}>No data available</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <FlatList
        data={visibleReports}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<AnimatedInput label="Search by machine" value={search} onChangeText={setSearch} style={styles.search} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReports(true)} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <GlassCard>
            <View style={styles.row}>
              <RemoteImage uri={item.machineImageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.thumb} />
              <View style={styles.rowContent}>
                <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                  {item.machineName} {item.machineCode ? `(${item.machineCode})` : ""}
                </Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Hours: {item.workingHours} | Output: {item.outputProduced}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Downtime: {item.downtime} | Expected: {item.expectedOutput}</Text>
            <Text style={[styles.efficiency, { color: theme.colors.primary }]}>Efficiency: {formatPercent(item.efficiency)}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{formatDateTime(item.timestamp)}</Text>
          </GlassCard>
        )}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  search: {
    marginBottom: 10
  },
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
  centerWrap: {
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

export default WorkerReportsScreen;
