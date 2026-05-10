import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, FAB, Portal, Switch, useTheme } from "react-native-paper";
import { useForm } from "react-hook-form";
import ScreenContainer from "../../components/ScreenContainer";
import FormTextField from "../../components/FormTextField";
import GlassCard from "../../components/GlassCard";
import EmptyState from "../../components/EmptyState";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import partService from "../../services/firebase/partService";
import machineService from "../../services/firebase/machineService";
import useAuthStore from "../../store/authStore";

const ManagePartsScreen = () => {
  const { user } = useAuthStore();
  const theme = useTheme();
  const { showSnackbar } = useUIStore();
  const [parts, setParts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [active, setActive] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: { partName: "", partNumber: "", operationCode: "", setupNumber: "", cycleTime: "", machineId: "" }
  });

  const load = useCallback(async () => {
    try {
      const [partsData, machineData] = await Promise.all([partService.list(), machineService.list()]);
      setParts(partsData);
      setMachines(machineData);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  }, [showSnackbar]);

  useEffect(() => { load(); }, [load]);

  const onSave = async (values) => {
    try {
      const payload = { ...values, isActive: active };
      if (editing) {
        await partService.update(editing.id, { ...payload, actorUid: user?.uid || "" });
      } else {
        await partService.create({ ...payload, actorUid: user?.uid || "" });
      }
      setVisible(false);
      setEditing(null);
      setActive(true);
      reset({ partName: "", partNumber: "", operationCode: "", setupNumber: "", cycleTime: "", machineId: "" });
      await load();
      showSnackbar("Part saved", "success");
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  return (
    <ScreenContainer>
      <FlatList
        data={parts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={<EmptyState text="No parts found." />}
        renderItem={({ item }) => (
          <GlassCard>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>{item.partName}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Part No: {item.partNumber}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Op: {item.operationCode} | Setup: {item.setupNumber}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Cycle: {item.cycleTime} | Active: {item.isActive ? "Yes" : "No"}</Text>
            <View style={styles.row}>
              <Button mode="contained-tonal" style={styles.actionBtn} onPress={() => {
                setEditing(item);
                setActive(item.isActive !== false);
                reset({
                  partName: item.partName || "",
                  partNumber: item.partNumber || "",
                  operationCode: item.operationCode || "",
                  setupNumber: item.setupNumber || "",
                  cycleTime: String(item.cycleTime || ""),
                  machineId: item.machineId || ""
                });
                setVisible(true);
              }}>Edit</Button>
              <Button style={styles.actionBtn} onPress={() => setPendingDelete(item)} textColor={theme.custom.colors.error}>Delete</Button>
            </View>
          </GlassCard>
        )}
      />
      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={styles.dialog}>
          <Dialog.Title>{editing ? "Edit Part" : "Add Part"}</Dialog.Title>
          <Dialog.Content>
            <FormTextField control={control} name="partName" label="Part Name" autoCapitalize="words" />
            <FormTextField control={control} name="partNumber" label="Part Number" />
            <FormTextField control={control} name="operationCode" label="Operation Code" />
            <FormTextField control={control} name="setupNumber" label="Setup Number" />
            <FormTextField control={control} name="cycleTime" label="Cycle Time" keyboardType="numeric" />
            <FormTextField control={control} name="machineId" label="Machine Id (optional)" />
            <View style={styles.machineWrap}>
              {machines.map((m) => (
                <Button key={m.id} compact mode="outlined" onPress={() => setValue("machineId", m.id)}>{m.code}</Button>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={{ color: theme.colors.onSurface }}>Active</Text>
              <Switch value={active} onValueChange={setActive} />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button onPress={handleSubmit(onSave)}>Save</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={Boolean(pendingDelete)} onDismiss={() => setPendingDelete(null)} style={styles.dialog}>
          <Dialog.Title>Delete Part</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.custom.colors.textMuted }}>
              If this part is currently assigned to machines/jobs, normal delete will be blocked.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              onPress={async () => {
                if (!pendingDelete) return;
                try {
                  await partService.remove(pendingDelete.id, { actorUid: user?.uid || "" });
                  showSnackbar("Part deleted", "success");
                  setPendingDelete(null);
                  await load();
                } catch (error) {
                  if (error?.code === "failed-precondition") {
                    showSnackbar("Part is currently assigned to machines/jobs.", "warning");
                    return;
                  }
                  showSnackbar(mapErrorMessage(error), "error");
                }
              }}
            >
              Delete
            </Button>
            <Button
              textColor={theme.custom.colors.error}
              onPress={async () => {
                if (!pendingDelete) return;
                try {
                  await partService.remove(pendingDelete.id, { force: true, actorUid: user?.uid || "" });
                  showSnackbar("Part force deleted", "success");
                  setPendingDelete(null);
                  await load();
                } catch (error) {
                  showSnackbar(mapErrorMessage(error), "error");
                }
              }}
            >
              Force Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <FAB icon="plus" style={styles.fab} onPress={() => { setEditing(null); setVisible(true); }} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  meta: { fontSize: 13, marginBottom: 2 },
  row: { flexDirection: "column", marginTop: 8 },
  actionBtn: { width: "100%", marginTop: 10 },
  dialog: { borderRadius: 12 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  fab: { position: "absolute", right: 16, bottom: 88 },
  machineWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }
});

export default ManagePartsScreen;
