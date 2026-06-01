import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, Portal, Switch, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenContainer from "../../components/ScreenContainer";
import GlassCard from "../../components/GlassCard";
import GlobalCalendar from "../../components/GlobalCalendar";
import EmptyState from "../../components/EmptyState";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import attendanceService from "../../services/firebase/attendanceService";
import { exportTablePdf } from "../../utils/pdfExport";

const AdminAttendanceScreen = () => {
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState({ dateFrom: "", dateTo: "" });
  const [editing, setEditing] = useState(null);
  const [present, setPresent] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await attendanceService.list({ role: "admin", from: range.dateFrom, to: range.dateTo });
      setRecords(data);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setRefreshing(false);
    }
  }, [range.dateFrom, range.dateTo, showSnackbar]);

  React.useEffect(() => { load(); }, [load]);

  const marks = useMemo(() => attendanceService.mapDates(records), [records]);
  const listBottomPadding = insets.bottom + 104;

  const onSave = async () => {
    if (!editing) return;
    try {
      await attendanceService.update(editing.id, { isPresent: present });
      showSnackbar("Attendance updated", "success");
      setEditing(null);
      await load();
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  return (
    <ScreenContainer>
      <GlobalCalendar markedDates={marks} onRangeChange={setRange} />
      <Button
        mode="contained-tonal"
        icon="file-pdf-box"
        style={styles.exportBtn}
        onPress={async () => {
          try {
            await exportTablePdf({
              title: "Attendance Export",
              subtitle: `${range.dateFrom || "All"} to ${range.dateTo || "All"}`,
              columns: [
                { key: "userName", label: "Worker" },
                { key: "shiftDate", label: "Date" },
                { key: "shiftType", label: "Shift" },
                { key: "login", label: "Login" },
                { key: "logout", label: "Logout" },
                { key: "totalHours", label: "Hours" },
                { key: "present", label: "Present" }
              ],
              rows: records.map((item) => ({
                userName: item.userName || "",
                shiftDate: item.shiftDate || "",
                shiftType: item.shiftType || "",
                login: item.loginTime?.toDate?.()?.toLocaleString?.() || "",
                logout: item.logoutTime?.toDate?.()?.toLocaleString?.() || "",
                totalHours: item.totalHours || 0,
                present: item.isPresent ? "Yes" : "No"
              }))
            });
          } catch (error) {
            showSnackbar(mapErrorMessage(error), "error");
          }
        }}
      >
        Export PDF
      </Button>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={<View style={{ height: listBottomPadding }} />}
        ListEmptyComponent={!refreshing ? <EmptyState text="No attendance records." /> : null}
        renderItem={({ item }) => (
          <GlassCard>
            <Text style={[styles.name, { color: theme.colors.onSurface }]}>{item.userName}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{item.shiftDate} ({item.shiftType})</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Shift Window: {item.startTimeText || "-"} - {item.endTimeText || "-"}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Login: {item.loginTime?.toDate?.()?.toLocaleString?.() || "-"}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Logout: {item.logoutTime?.toDate?.()?.toLocaleString?.() || "-"}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Hours: {item.totalHours || 0}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Status: {item.status || "-"}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Present: {item.isPresent ? "Yes" : "No"}</Text>
            <Button mode="contained-tonal" onPress={() => { setEditing(item); setPresent(Boolean(item.isPresent)); }}>
              Edit
            </Button>
          </GlassCard>
        )}
      />
      <Portal>
        <Dialog visible={Boolean(editing)} onDismiss={() => setEditing(null)} style={styles.dialog}>
          <Dialog.Title>Edit Attendance</Dialog.Title>
          <Dialog.Content>
            <View style={styles.switchRow}>
              <Text style={{ color: theme.colors.onSurface }}>Is Present</Text>
              <Switch value={present} onValueChange={setPresent} />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(null)}>Cancel</Button>
            <Button onPress={onSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingBottom: 8 },
  exportBtn: { borderRadius: 10, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  meta: { fontSize: 13, marginBottom: 2 },
  dialog: { borderRadius: 14 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }
});

export default AdminAttendanceScreen;
