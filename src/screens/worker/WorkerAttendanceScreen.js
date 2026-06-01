import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, Portal, useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useAuthStore from "../../store/authStore";
import useUIStore from "../../store/uiStore";
import ScreenContainer from "../../components/ScreenContainer";
import GlassCard from "../../components/GlassCard";
import EmptyState from "../../components/EmptyState";
import GlobalCalendar from "../../components/GlobalCalendar";
import { mapErrorMessage } from "../../utils/errorMapper";
import useGeoFence from "../../hooks/useGeoFence";
import { getShiftDate, getShiftType } from "../../utils/shift";
import { useCompanyConfig } from "../../context/companyConfig";
import attendanceService from "../../services/firebase/attendanceService";

const WorkerAttendanceScreen = () => {
  const { user, profile } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftType, setShiftType] = useState("day");
  const [range, setRange] = useState({ dateFrom: "", dateTo: "" });
  const [confirmType, setConfirmType] = useState(null);
  const { isInsideRadius } = useGeoFence();
  const { currentLocation, locationRestrictionEnabled } = useCompanyConfig();

  const role = profile?.role || "";

  const load = useCallback(async (isPull = false) => {
    if (!user?.uid) return;
    if (isPull) setRefreshing(true); else setLoading(true);
    try {
      const data = await attendanceService.list({
        role,
        userId: user.uid,
        from: range.dateFrom,
        to: range.dateTo
      });
      setRecords(data);
      setVisibleCount(20);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range.dateFrom, range.dateTo, role, showSnackbar, user?.uid]);

  useFocusEffect(React.useCallback(() => { load(false); }, [load]));

  const onCheckIn = async () => {
    if (locationRestrictionEnabled && !isInsideRadius) {
      showSnackbar("You must be within company premises", "warning");
      return;
    }
    try {
      const now = new Date();
      await attendanceService.markLogin({
        user: { uid: user.uid, fullName: profile?.fullName || user.displayName || "Worker" },
        role,
        shiftType: shiftType || getShiftType(now),
        loginTime: now,
        startTimeText: shiftType === "night" ? "20:00" : "08:00",
        endTimeText: shiftType === "night" ? "08:00" : "20:00",
        location: currentLocation
      });
      showSnackbar("Attendance marked", "success");
      await load(false);
    } catch (error) {
      if (error?.code === "already-exists") {
        showSnackbar("Attendance already marked for today.", "warning");
        return;
      }
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  const onCheckOut = async () => {
    if (locationRestrictionEnabled && !isInsideRadius) {
      showSnackbar("You must be within company premises", "warning");
      return;
    }
    try {
      const result = await attendanceService.markLogout({ userId: user.uid, shiftDate: getShiftDate(new Date()) });
      if (!result) {
        showSnackbar("No login found for today.", "warning");
      } else if (result.alreadyLoggedOut) {
        showSnackbar(`Already logged out. Hours: ${result.totalHours || 0}`, "warning");
      } else {
        showSnackbar(`Logout recorded. Hours: ${result.totalHours || 0}`, "success");
      }
      await load(false);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  const marks = useMemo(() => attendanceService.mapDates(records), [records]);
  const visibleRecords = useMemo(() => records.slice(0, visibleCount), [records, visibleCount]);
  const listBottomPadding = insets.bottom + 104;

  return (
    <ScreenContainer>
      <FlatList
        data={visibleRecords}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
        ListHeaderComponent={
          <View>
            <GlobalCalendar markedDates={marks} onRangeChange={setRange} />
            <GlassCard>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>Shift</Text>
        <View style={styles.row}>
          <Button mode={shiftType === "day" ? "contained" : "outlined"} onPress={() => { setShiftType("day"); }}>Day</Button>
          <Button mode={shiftType === "night" ? "contained" : "outlined"} onPress={() => { setShiftType("night"); }}>Night</Button>
        </View>
        <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>
          Time is captured automatically from current device time.
        </Text>
        <View style={styles.row}>
          <Button mode="contained-tonal" onPress={() => setConfirmType("login")} disabled={locationRestrictionEnabled && !isInsideRadius}>Mark Login</Button>
          <Button mode="outlined" onPress={() => setConfirmType("logout")} disabled={locationRestrictionEnabled && !isInsideRadius}>Mark Logout</Button>
        </View>
      </GlassCard>
          </View>
        }
        ListEmptyComponent={loading ? <EmptyState text="Loading attendance..." /> : <EmptyState text="No attendance records." />}
        ListFooterComponent={
          records.length > visibleCount ? (
            <Button mode="contained-tonal" style={styles.loadBtn} onPress={() => setVisibleCount((prev) => prev + 20)}>
              Load More
            </Button>
          ) : null
        }
        renderItem={({ item }) => (
          <GlassCard>
            <Text style={[styles.itemTitle, { color: theme.colors.onSurface }]}>{item.shiftDate} ({item.shiftType})</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Shift Window: {item.startTimeText || "-"} - {item.endTimeText || "-"}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Login: {item.loginTime?.toDate?.()?.toLocaleString?.() || "-"}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Logout: {item.logoutTime?.toDate?.()?.toLocaleString?.() || "-"}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Hours: {item.totalHours || 0}</Text>
          </GlassCard>
        )}
      />
      <Portal>
        <Dialog visible={Boolean(confirmType)} onDismiss={() => setConfirmType(null)} style={styles.dialog}>
          <Dialog.Title>{confirmType === "login" ? "Confirm Login" : "Confirm Logout"}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.custom.colors.textMuted }}>
              {confirmType === "login"
                ? "Mark attendance login using current time?"
                : "Mark attendance logout using current time and calculate worked hours?"}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmType(null)}>Cancel</Button>
            <Button
              onPress={async () => {
                const currentAction = confirmType;
                setConfirmType(null);
                if (currentAction === "login") await onCheckIn();
                if (currentAction === "logout") await onCheckOut();
              }}
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 24 },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, marginBottom: 8 },
  loadBtn: { borderRadius: 10, marginTop: 8 },
  itemTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  meta: { fontSize: 13, marginBottom: 2 },
  dialog: { borderRadius: 14 }
});

export default WorkerAttendanceScreen;
