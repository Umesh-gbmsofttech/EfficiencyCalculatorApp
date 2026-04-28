import React, { useCallback, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, Portal, Switch, useTheme } from "react-native-paper";
import ScreenContainer from "../../components/ScreenContainer";
import GlassCard from "../../components/GlassCard";
import GlobalCalendar from "../../components/GlobalCalendar";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { getAttendanceDateMap, getAttendanceRecords, updateAttendanceRecord } from "../../services/firebase/attendance";

const AdminAttendanceScreen = () => {
  const { showSnackbar } = useUIStore();
  const theme = useTheme();
  const [records, setRecords] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState({ dateFrom: "", dateTo: "" });
  const [editing, setEditing] = useState(null);
  const [present, setPresent] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getAttendanceRecords({ role: "admin", from: range.dateFrom, to: range.dateTo });
      setRecords(data);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setRefreshing(false);
    }
  }, [range.dateFrom, range.dateTo, showSnackbar]);

  React.useEffect(() => { load(); }, [load]);

  const marks = useMemo(() => getAttendanceDateMap(records), [records]);

  const onSave = async () => {
    if (!editing) return;
    try {
      await updateAttendanceRecord(editing.id, { isPresent: present });
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
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        renderItem={({ item }) => (
          <GlassCard>
            <Text style={[styles.name, { color: theme.colors.onSurface }]}>{item.userName}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{item.shiftDate} ({item.shiftType})</Text>
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
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  meta: { fontSize: 13, marginBottom: 2 },
  dialog: { borderRadius: 14 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }
});

export default AdminAttendanceScreen;
