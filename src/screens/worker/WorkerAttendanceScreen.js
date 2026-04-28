import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import useAuthStore from "../../store/authStore";
import useUIStore from "../../store/uiStore";
import ScreenContainer from "../../components/ScreenContainer";
import GlassCard from "../../components/GlassCard";
import EmptyState from "../../components/EmptyState";
import GlobalCalendar from "../../components/GlobalCalendar";
import { mapErrorMessage } from "../../utils/errorMapper";
import {
  getAttendanceDateMap,
  getAttendanceRecords,
  markAttendanceLogin,
  markAttendanceLogout
} from "../../services/firebase/attendance";
import useGeoFence from "../../hooks/useGeoFence";
import { getShiftDate } from "../../utils/shift";

const WorkerAttendanceScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftType, setShiftType] = useState("day");
  const [range, setRange] = useState({ dateFrom: "", dateTo: "" });
  const { isInsideRadius } = useGeoFence();

  const role = profile?.role || "";

  const load = useCallback(async (isPull = false) => {
    if (!user?.uid) return;
    if (isPull) setRefreshing(true); else setLoading(true);
    try {
      const data = await getAttendanceRecords({
        role,
        userId: user.uid,
        from: range.dateFrom,
        to: range.dateTo
      });
      setRecords(data);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range.dateFrom, range.dateTo, role, showSnackbar, user?.uid]);

  useFocusEffect(React.useCallback(() => { load(false); }, [load]));

  const onCheckIn = async () => {
    if (!isInsideRadius) {
      showSnackbar("You must be within company premises (200m) to mark attendance.", "warning");
      return;
    }
    try {
      await markAttendanceLogin({
        user: { uid: user.uid, fullName: profile?.fullName || user.displayName || "Worker" },
        role,
        shiftType
      });
      showSnackbar("Attendance marked", "success");
      await load(false);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  const onCheckOut = async () => {
    if (!isInsideRadius) {
      showSnackbar("You must be within company premises (200m) to mark attendance.", "warning");
      return;
    }
    try {
      await markAttendanceLogout({ userId: user.uid, shiftDate: getShiftDate(new Date()) });
      showSnackbar("Logout time recorded", "success");
      await load(false);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  const marks = useMemo(() => getAttendanceDateMap(records), [records]);

  return (
    <ScreenContainer>
      <GlobalCalendar markedDates={marks} onRangeChange={setRange} />
      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Shift</Text>
        <View style={styles.row}>
          <Button mode={shiftType === "day" ? "contained" : "outlined"} onPress={() => setShiftType("day")}>Day</Button>
          <Button mode={shiftType === "night" ? "contained" : "outlined"} onPress={() => setShiftType("night")}>Night</Button>
        </View>
        <View style={styles.row}>
          <Button mode="contained-tonal" onPress={onCheckIn} disabled={!isInsideRadius}>Mark Login</Button>
          <Button mode="outlined" onPress={onCheckOut} disabled={!isInsideRadius}>Mark Logout</Button>
        </View>
      </GlassCard>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        ListEmptyComponent={loading ? <EmptyState text="Loading attendance..." /> : <EmptyState text="No attendance records." />}
        renderItem={({ item }) => (
          <GlassCard>
            <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]}>{item.shiftDate} ({item.shiftType})</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Login: {item.loginTime?.toDate?.()?.toLocaleString?.() || "-"}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Logout: {item.logoutTime?.toDate?.()?.toLocaleString?.() || "-"}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Hours: {item.totalHours || 0}</Text>
          </GlassCard>
        )}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  itemTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  meta: { fontSize: 13, marginBottom: 2 }
});

export default WorkerAttendanceScreen;
