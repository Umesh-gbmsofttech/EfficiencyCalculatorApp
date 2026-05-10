import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import StatCard from "../../components/StatCard";
import ScreenContainer from "../../components/ScreenContainer";
import GlassCard from "../../components/GlassCard";
import RemoteImage from "../../components/RemoteImage";
import PrimaryButton from "../../components/PrimaryButton";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { formatPercent } from "../../utils/formatters";
import useDashboardData from "../../hooks/useDashboardData";

const AdminDashboardScreen = () => {
  const { stats, trend, attendance: todayAttendance, load } = useDashboardData({ includeAttendance: true });
  const [refreshing, setRefreshing] = useState(false);
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const loadDashboard = useCallback(async () => {
    try {
      await load();
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  }, [load, showSnackbar]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const chartData = useMemo(() => {
    const points = trend.length ? trend.map((entry) => Number(entry.efficiency || 0)) : [0, 0, 0, 0, 0, 0, 0];
    return {
      labels: points.map((_, index) => `${index + 1}`),
      datasets: [{ data: points }]
    };
  }, [trend]);

  const quickActions = [
    { title: "Add Worker", route: "ManageWorkers" },
    { title: "Manage Machines", route: "ManageMachines" },
    { title: "Manage Parts", route: "ManageParts" },
    { title: "View Reports", route: "ReportsCenter" },
    { title: "Salary System", route: "SalarySystem" },
    { title: "Attendance Control", route: "AttendanceControl" }
  ];

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadDashboard();
            setRefreshing(false);
          }}
        />
      }
    >
      <View style={styles.row}>
        <View style={styles.col}>
          <StatCard title="Workers" value={stats.workers} />
        </View>
        <View style={styles.col}>
          <StatCard title="Machines" value={stats.machines} />
        </View>
      </View>
      <StatCard title="Total Logs" value={stats.logs} caption="All submitted efficiency records" />
      <GlassCard>
        <Text style={[styles.heading, { color: theme.colors.onSurface }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <View key={action.route} style={styles.quickCell}>
              <PrimaryButton title={action.title} onPress={() => navigation.navigate(action.route)} style={styles.quickBtn} />
            </View>
          ))}
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={[styles.heading, { color: theme.colors.onSurface }]}>7-Point Efficiency Trend</Text>
        <View style={[styles.chartWrap, { backgroundColor: theme.colors.surfaceVariant || theme.colors.surface }]}>
          <LineChart
            data={chartData}
            width={Math.max(width - 76, 260)}
            height={220}
            chartConfig={{
              backgroundGradientFrom: "transparent",
              backgroundGradientTo: "transparent",
              decimalPlaces: 0,
              color: () => theme.colors.primary,
              labelColor: () => theme.custom.colors.textMuted,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: theme.custom.colors.accent
              },
              propsForBackgroundLines: {
                stroke: theme.custom.colors.border,
                strokeWidth: 1
              }
            }}
            withInnerLines
            withOuterLines={false}
            withVerticalLines={false}
            bezier
            style={styles.chart}
          />
        </View>
      </GlassCard>

      {trend.length ? (
        <GlassCard>
          <Text style={[styles.heading, { color: theme.colors.onSurface }]}>Recent Logs</Text>
          {trend
            .slice(-4)
            .reverse()
            .map((entry) => (
              <View key={entry.id} style={styles.logRow}>
                <RemoteImage uri={entry.machineImageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.logThumb} />
                <View style={styles.logMeta}>
                  <Text style={[styles.logTitle, { color: theme.colors.onSurface }]}>{entry.machineName || "Machine"}</Text>
                  <Text style={[styles.logText, { color: theme.custom.colors.textMuted }]}>
                    {entry.workerName || "Worker"} | {formatPercent(entry.efficiency)}
                  </Text>
                </View>
              </View>
            ))}
        </GlassCard>
      ) : null}
      <GlassCard>
        <Text style={[styles.heading, { color: theme.colors.onSurface }]}>Today Logged Workers</Text>
        {todayAttendance.length ? (
          todayAttendance.slice(0, 8).map((entry) => (
            <View key={entry.id} style={styles.logRow}>
              <View style={[styles.logThumb, { alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ color: theme.colors.onSurface, fontSize: 12, fontWeight: "700" }}>
                  {(entry.userName || "W").slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={styles.logMeta}>
                <Text style={[styles.logTitle, { color: theme.colors.onSurface }]}>{entry.userName || "Worker"}</Text>
                <Text style={[styles.logText, { color: theme.custom.colors.textMuted }]}>
                  Login: {entry.loginTime?.toDate?.()?.toLocaleTimeString?.() || "-"} | Logout: {entry.logoutTime?.toDate?.()?.toLocaleTimeString?.() || "-"} | Hours: {entry.totalHours || 0}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.logText, { color: theme.custom.colors.textMuted }]}>No worker has logged attendance today.</Text>
        )}
      </GlassCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10
  },
  col: {
    flex: 1
  },
  heading: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 8
  },
  chart: {
    borderRadius: 12,
    alignSelf: "center"
  },
  chartWrap: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  quickBtn: {
    width: "100%"
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
    marginHorizontal: -4
  },
  quickCell: {
    width: "50%",
    paddingHorizontal: 4,
    marginTop: 8
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  logThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E2E8F0"
  },
  logMeta: {
    flex: 1
  },
  logTitle: {
    fontSize: 14,
    fontWeight: "600"
  },
  logText: {
    fontSize: 12,
    marginTop: 2
  }
});

const MACHINE_PLACEHOLDER = require("../../../assets/logo.png");

export default AdminDashboardScreen;
