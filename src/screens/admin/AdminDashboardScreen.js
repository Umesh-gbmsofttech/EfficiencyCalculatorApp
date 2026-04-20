import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import StatCard from "../../components/StatCard";
import ScreenContainer from "../../components/ScreenContainer";
import GlassCard from "../../components/GlassCard";
import RemoteImage from "../../components/RemoteImage";
import { getDashboardStats, getEfficiencyTrend } from "../../services/firebase/firestore";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { formatPercent } from "../../utils/formatters";

const AdminDashboardScreen = () => {
  const [stats, setStats] = useState({ workers: 0, machines: 0, logs: 0 });
  const [trend, setTrend] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const loadDashboard = useCallback(async () => {
    try {
      const [summary, trendData] = await Promise.all([getDashboardStats(), getEfficiencyTrend({})]);
      setStats(summary);
      setTrend(trendData.slice(-7));
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
        <Text style={[styles.heading, { color: theme.colors.onSurface }]}>7-Point Efficiency Trend</Text>
        <LineChart
          data={chartData}
          width={Math.max(width - 64, 280)}
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
            }
          }}
          withInnerLines={false}
          withOuterLines={false}
          bezier
          style={styles.chart}
        />
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
    borderRadius: 10,
    marginLeft: -16
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
