import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, RefreshControl, ScrollView } from "react-native";
import { Card, Text } from "react-native-paper";
import { LineChart } from "react-native-chart-kit";
import StatCard from "../../components/StatCard";
import { getDashboardStats, getEfficiencyTrend } from "../../services/firebase/firestore";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";

const AdminDashboardScreen = () => {
  const [stats, setStats] = useState({ workers: 0, machines: 0, logs: 0 });
  const [trend, setTrend] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const { showSnackbar } = useUIStore();

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

  const chartData = useMemo(() => {
    const points = trend.length
      ? trend.map((entry) => Number(entry.efficiency || 0))
      : [0, 0, 0, 0, 0, 0, 0];
    return {
      labels: points.map((_, index) => `${index + 1}`),
      datasets: [{ data: points }]
    };
  }, [trend]);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
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
      <StatCard title="Workers" value={stats.workers} />
      <StatCard title="Machines" value={stats.machines} />
      <StatCard title="Total Logs" value={stats.logs} />

      <Card>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>
            7-Point Efficiency Trend
          </Text>
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 64}
            height={210}
            chartConfig={{
              backgroundGradientFrom: "#FFFFFF",
              backgroundGradientTo: "#FFFFFF",
              color: () => "#2E7D32",
              labelColor: () => "#333"
            }}
            bezier
            withDots
            style={{ borderRadius: 8 }}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

export default AdminDashboardScreen;
