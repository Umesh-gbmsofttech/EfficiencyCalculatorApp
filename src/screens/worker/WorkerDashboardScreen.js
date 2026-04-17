import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, RefreshControl, ScrollView } from "react-native";
import { Card, Text } from "react-native-paper";
import { LineChart } from "react-native-chart-kit";
import useAuthStore from "../../store/authStore";
import StatCard from "../../components/StatCard";
import { getDashboardStats, getEfficiencyTrend } from "../../services/firebase/firestore";
import { formatPercent } from "../../utils/formatters";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";

const WorkerDashboardScreen = () => {
  const { user } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const [stats, setStats] = useState({ workers: 0, machines: 0, logs: 0 });
  const [trend, setTrend] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [summary, trendData] = await Promise.all([
        getDashboardStats(user.uid),
        getEfficiencyTrend({ uid: user.uid })
      ]);
      setStats(summary);
      setTrend(trendData.slice(-7));
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  }, [showSnackbar, user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const averageEfficiency = useMemo(() => {
    if (!trend.length) return 0;
    const total = trend.reduce((sum, item) => sum + Number(item.efficiency || 0), 0);
    return total / trend.length;
  }, [trend]);

  const chartData = {
    labels: trend.length ? trend.map((_, i) => `${i + 1}`) : ["1", "2", "3", "4", "5", "6", "7"],
    datasets: [{ data: trend.length ? trend.map((t) => Number(t.efficiency || 0)) : [0, 0, 0, 0, 0, 0, 0] }]
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await loadData();
            setRefreshing(false);
          }}
        />
      }
    >
      <StatCard title="My Logs" value={stats.logs} />
      <StatCard title="Average Efficiency" value={formatPercent(averageEfficiency)} />

      <Card>
        <Card.Content>
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>
            My Efficiency Trend
          </Text>
          <LineChart
            data={chartData}
            width={Dimensions.get("window").width - 64}
            height={210}
            chartConfig={{
              backgroundGradientFrom: "#FFFFFF",
              backgroundGradientTo: "#FFFFFF",
              color: () => "#0288D1",
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

export default WorkerDashboardScreen;
