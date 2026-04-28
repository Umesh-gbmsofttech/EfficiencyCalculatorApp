import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, Menu, Portal, useTheme } from "react-native-paper";
import AnimatedInput from "../../components/AnimatedInput";
import GlassCard from "../../components/GlassCard";
import ScreenContainer from "../../components/ScreenContainer";
import { getWorkers } from "../../services/firebase/firestore";
import { calculateMonthlySalary, settleMonthlySalary, upsertSalaryConfig } from "../../services/firebase/salary";
import useUIStore from "../../store/uiStore";
import useAuthStore from "../../store/authStore";
import { mapErrorMessage } from "../../utils/errorMapper";

const AdminSalaryScreen = () => {
  const theme = useTheme();
  const { showSnackbar } = useUIStore();
  const { user } = useAuthStore();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [roleMenu, setRoleMenu] = useState(false);
  const [form, setForm] = useState({
    salaryType: "monthly",
    baseAmount: "",
    workingDaysPerMonth: "26",
    bonusDays: "0",
    penaltyDays: "0"
  });
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getWorkers({ role: "admin", uid: user?.uid });
      setWorkers(list);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, user?.uid]);

  useEffect(() => { load(); }, [load]);

  const onSaveConfig = async () => {
    if (!editing) return;
    try {
      await upsertSalaryConfig(editing.id, form);
      showSnackbar("Salary config saved", "success");
      setEditing(null);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  const onSettle = async (workerId) => {
    try {
      const [year, m] = month.split("-").map(Number);
      const summary = await settleMonthlySalary({ userId: workerId, year, month: m, actorUid: user?.uid });
      showSnackbar(`Settled: ${summary?.netAmount || 0}`, "success");
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  return (
    <ScreenContainer>
      <AnimatedInput label="Settlement Month (YYYY-MM)" value={month} onChangeText={setMonth} style={styles.monthInput} />
      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={loading ? null : <Text style={{ color: theme.custom.colors.textMuted }}>No workers</Text>}
        renderItem={({ item }) => (
          <GlassCard>
            <Text style={[styles.name, { color: theme.colors.onSurface }]}>{item.fullName}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{item.role}</Text>
            <View style={styles.row}>
              <Button mode="contained-tonal" onPress={() => setEditing(item)}>Assign Salary</Button>
              <Button mode="outlined" onPress={() => onSettle(item.id)}>Settle Salary</Button>
            </View>
          </GlassCard>
        )}
      />
      <Portal>
        <Dialog visible={Boolean(editing)} onDismiss={() => setEditing(null)} style={styles.dialog}>
          <Dialog.Title>Salary Config</Dialog.Title>
          <Dialog.Content>
            <Menu
              visible={roleMenu}
              onDismiss={() => setRoleMenu(false)}
              anchor={<Button mode="outlined" onPress={() => setRoleMenu(true)} style={styles.typeBtn}>Type: {form.salaryType}</Button>}
            >
              {["daily", "weekly", "monthly"].map((type) => (
                <Menu.Item key={type} title={type} onPress={() => { setForm((p) => ({ ...p, salaryType: type })); setRoleMenu(false); }} />
              ))}
            </Menu>
            <AnimatedInput label="Base Amount" keyboardType="numeric" value={form.baseAmount} onChangeText={(v) => setForm((p) => ({ ...p, baseAmount: v }))} />
            <AnimatedInput label="Working Days/Month" keyboardType="numeric" value={form.workingDaysPerMonth} onChangeText={(v) => setForm((p) => ({ ...p, workingDaysPerMonth: v }))} />
            <AnimatedInput label="Bonus Days" keyboardType="numeric" value={form.bonusDays} onChangeText={(v) => setForm((p) => ({ ...p, bonusDays: v }))} />
            <AnimatedInput label="Penalty Days" keyboardType="numeric" value={form.penaltyDays} onChangeText={(v) => setForm((p) => ({ ...p, penaltyDays: v }))} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditing(null)}>Cancel</Button>
            <Button onPress={onSaveConfig}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  monthInput: { marginBottom: 10 },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  meta: { fontSize: 13, marginBottom: 6 },
  row: { flexDirection: "row", gap: 8 },
  dialog: { borderRadius: 14 },
  typeBtn: { marginBottom: 8 }
});

export default AdminSalaryScreen;
