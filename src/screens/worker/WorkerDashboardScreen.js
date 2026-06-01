import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { LineChart } from "react-native-chart-kit";
import { Button, Dialog, Portal, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import useAuthStore from "../../store/authStore";
import StatCard from "../../components/StatCard";
import GlassCard from "../../components/GlassCard";
import RemoteImage from "../../components/RemoteImage";
import ScreenContainer from "../../components/ScreenContainer";
import { formatDateTime, formatPercent, formatTimeOnly } from "../../utils/formatters";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { getRecentAttendance } from "../../services/firebase/attendance";
import useDashboardData from "../../hooks/useDashboardData";

const WorkerDashboardScreen = () => {
  const { user } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { stats, trend, load: loadDashboard } = useDashboardData({ uid: user?.uid });
  const [ recentAttendance, setRecentAttendance ] = useState([]);
  const [ refreshing, setRefreshing ] = useState(false);
  const [ selectedReport, setSelectedReport ] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [ dashboardResult, attendanceResult ] = await Promise.allSettled([
        loadDashboard(),
        getRecentAttendance({ userId: user.uid, max: 4 })
      ]);
      if (dashboardResult.status === "rejected" && ![ "failed-precondition", "permission-denied" ].includes(String(dashboardResult.reason?.code || ""))) {
        throw dashboardResult.reason;
      }
      setRecentAttendance(attendanceResult.status === "fulfilled" ? attendanceResult.value : []);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  }, [ loadDashboard, showSnackbar, user?.uid ]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [ loadData ])
  );

  const averageEfficiency = useMemo(() => {
    if (!trend.length) return 0;
    const total = trend.reduce((sum, item) => sum + Number(item.efficiency || 0), 0);
    return total / trend.length;
  }, [ trend ]);

  const trendPoints = useMemo(() => trend.map((item) => Number(item.efficiency || 0)), [ trend ]);
  const latestEfficiency = trendPoints.length ? trendPoints[ trendPoints.length - 1 ] : 0;
  const previousEfficiency = trendPoints.length > 1 ? trendPoints[ trendPoints.length - 2 ] : latestEfficiency;
  const delta = latestEfficiency - previousEfficiency;
  const trendDirection = delta > 0 ? "Up" : delta < 0 ? "Down" : "Flat";

  const chartData = useMemo(
    () => ({
      labels: trend.length
        ? trend.map((item) => {
          const date = item.timestamp?.toDate?.();
          return date ? `${date.getDate()}` : "";
        })
        : [ "", "", "", "", "", "", "" ],
      datasets: [ { data: trend.length ? trendPoints : [ 0, 0, 0, 0, 0, 0, 0 ] } ]
    }),
    [ trend, trendPoints ]
  );

  return (
    <ScreenContainer
      scroll
      refreshControl={
        <RefreshControl
          refreshing={ refreshing }
          onRefresh={ async () => {
            setRefreshing(true);
            await loadData();
            setRefreshing(false);
          } }
        />
      }
    >
      <StatCard title="My Reports" value={ stats.reports || stats.logs } />
      <StatCard title="Average Efficiency" value={ formatPercent(averageEfficiency) } />
      {/* <StatCard title="Latest Salary" value={latestSalary ? `Rs ${Number(latestSalary.finalSalary || 0).toFixed(0)}` : "Not available"} caption={latestSalary?.month || ""} /> */ }

      <GlassCard>
        <View style={ styles.trendHeader }>
          <Text style={ [ styles.heading, { color: theme.colors.onSurface } ] }>My Efficiency Graph</Text>
          <View
            style={ [
              styles.trendChip,
              {
                backgroundColor: theme.dark ? "rgba(59,130,246,0.2)" : "rgba(37,99,235,0.12)"
              }
            ] }
          >
            <Text style={ [ styles.trendChipText, { color: theme.colors.primary } ] }>{ trendDirection }</Text>
          </View>
        </View>
        <View style={ styles.trendStatsRow }>
          <View style={ styles.trendStat }>
            <Text style={ [ styles.trendStatLabel, { color: theme.custom.colors.textMuted } ] }>Latest</Text>
            <Text style={ [ styles.trendStatValue, { color: theme.colors.onSurface } ] }>{ formatPercent(latestEfficiency) }</Text>
          </View>
          <View style={ styles.trendStat }>
            <Text style={ [ styles.trendStatLabel, { color: theme.custom.colors.textMuted } ] }>Delta</Text>
            <Text style={ [ styles.trendStatValue, { color: delta >= 0 ? theme.custom.colors.success : theme.custom.colors.error } ] }>
              { delta >= 0 ? "+" : "" }
              { delta.toFixed(1) }%
            </Text>
          </View>
        </View>
        { trend.length ? (
          <LineChart
            data={ chartData }
            width={ Math.max(width - 64, 280) }
            height={ 210 }
            yAxisSuffix="%"
            fromZero
            chartConfig={ {
              backgroundGradientFrom: "transparent",
              backgroundGradientTo: "transparent",
              color: () => theme.custom.colors.accent,
              labelColor: () => theme.custom.colors.textMuted,
              decimalPlaces: 0,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: theme.colors.primary
              }
            } }
            withInnerLines={ false }
            withOuterLines={ false }
            bezier
            style={ styles.chart }
          />
        ) : (
          <View style={ styles.emptyTrendWrap }>
            <Text style={ [ styles.emptyTrendText, { color: theme.custom.colors.textMuted } ] }>
              No reports yet. Add entries to see your efficiency trend.
            </Text>
          </View>
        ) }
      </GlassCard>

      { trend.length ? (
        <GlassCard>
          <Text style={ [ styles.heading, { color: theme.colors.onSurface } ] }>Recent Reports</Text>
          { trend
            .slice(-3)
            .reverse()
            .map((item) => (
              <Pressable key={ item.id } style={ styles.logRow } onPress={ () => setSelectedReport(item) }>
                <RemoteImage uri={ item.machineImageUrl } fallbackSource={ MACHINE_PLACEHOLDER } style={ styles.logThumb } />
                <View style={ styles.logMeta }>
                  <Text style={ [ styles.logTitle, { color: theme.colors.onSurface } ] }>{ item.machineName || "Machine" }</Text>
                  <Text style={ [ styles.logText, { color: theme.custom.colors.textMuted } ] }>
                    Efficiency: { formatPercent(item.efficiency) }
                  </Text>
                </View>
              </Pressable>
            )) }
        </GlassCard>
      ) : null }
      <GlassCard>
        <Text style={ [ styles.heading, { color: theme.colors.onSurface } ] }>Attendance Snapshot</Text>
        { recentAttendance.length ? (
          <View style={ styles.attGrid }>
            { recentAttendance.map((item, index) => (
              <Animated.View key={ item.id } entering={ FadeInUp.delay(index * 60).duration(220) } style={ [ styles.attTile, { borderColor: theme.custom.colors.border } ] }>
                <Text style={ [ styles.logTitle, { color: theme.colors.onSurface } ] }>{ item.shiftDate }</Text>
                <Text style={ [ styles.logText, { color: theme.custom.colors.textMuted } ] }>
                  { item.shiftType } | { item.totalHours || 0 } hrs
                </Text>
                <Text style={ [ styles.logText, { color: theme.custom.colors.textMuted } ] }>
                  { formatTimeOnly(item.loginTime) } - { formatTimeOnly(item.logoutTime) }
                </Text>
              </Animated.View>
            )) }
          </View>
        ) : (
          <Text style={ [ styles.logText, { color: theme.custom.colors.textMuted } ] }>No attendance records yet.</Text>
        ) }
      </GlassCard>
      <Portal>
        <Dialog visible={ Boolean(selectedReport) } onDismiss={ () => setSelectedReport(null) } style={ styles.dialog }>
          <Dialog.Title>Report Details</Dialog.Title>
          <Dialog.Content>
            { selectedReport ? (
              <View>
                <Text style={ [ styles.detailLine, { color: theme.colors.onSurface } ] }>{ selectedReport.machineName || "Machine" }</Text>
                <Text style={ [ styles.logText, { color: theme.custom.colors.textMuted } ] }>Date: { formatDateTime(selectedReport.timestamp) }</Text>
                <Text style={ [ styles.logText, { color: theme.custom.colors.textMuted } ] }>Job: { selectedReport.jobName || "-" }</Text>
                <Text style={ [ styles.logText, { color: theme.custom.colors.textMuted } ] }>Start: { formatTimeOnly(selectedReport.jobStartTime) } | End: { formatTimeOnly(selectedReport.jobEndTime) }</Text>
                <Text style={ [ styles.logText, { color: theme.custom.colors.textMuted } ] }>Output: { selectedReport.outputProduced || selectedReport.actualProduction || 0 }</Text>
                <Text style={ [ styles.logText, { color: theme.custom.colors.textMuted } ] }>Expected: { selectedReport.expectedProduction || selectedReport.expectedOutput || 0 }</Text>
                <Text style={ [ styles.logText, { color: theme.colors.primary } ] }>Efficiency: { formatPercent(selectedReport.efficiency) }</Text>
              </View>
            ) : null }
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={ () => setSelectedReport(null) }>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  heading: {
    fontSize: 17,
    fontWeight: "600"
  },
  trendChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  trendChipText: {
    fontSize: 12,
    fontWeight: "700"
  },
  trendStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8
  },
  trendStat: {
    flex: 1
  },
  trendStatLabel: {
    fontSize: 12,
    fontWeight: "500"
  },
  trendStatValue: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: "700"
  },
  emptyTrendWrap: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyTrendText: {
    fontSize: 14,
    textAlign: "center"
  },
  chart: {
    borderRadius: 10,
    marginLeft: -8
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
  },
  attRow: {
    marginTop: 6,
    paddingTop: 6
  },
  attGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  attTile: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10
  },
  dialog: {
    borderRadius: 14
  },
  detailLine: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8
  }
});

const MACHINE_PLACEHOLDER = require("../../../assets/logo.png");

export default WorkerDashboardScreen;
