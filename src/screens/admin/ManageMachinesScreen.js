import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, FAB, Portal, useTheme } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import FormTextField from "../../components/FormTextField";
import EmptyState from "../../components/EmptyState";
import AnimatedInput from "../../components/AnimatedInput";
import GlassCard from "../../components/GlassCard";
import RemoteImage from "../../components/RemoteImage";
import ScreenContainer from "../../components/ScreenContainer";
import { machineSchema } from "../../utils/validationSchemas";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import {
  createMachine,
  editMachine,
  getMachines,
  normalizeImageUrl,
  removeMachine
} from "../../services/firebase/firestore";

const ManageMachinesScreen = () => {
  const [machines, setMachines] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const { showSnackbar } = useUIStore();
  const theme = useTheme();

  const { control, reset, handleSubmit, watch, setValue } = useForm({
    resolver: yupResolver(machineSchema),
    defaultValues: { name: "", code: "", expectedOutputPerHour: "", imageUrl: "" }
  });
  const selectedImageUrl = watch("imageUrl");
  const previewImageUrl = normalizeImageUrl(selectedImageUrl);
  const isEditing = Boolean(editing);

  const loadMachines = useCallback(async () => {
    try {
      const response = await getMachines();
      setMachines(response);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const filtered = useMemo(
    () =>
      machines.filter(
        (machine) =>
          machine.name.toLowerCase().includes(search.toLowerCase()) ||
          machine.code.toLowerCase().includes(search.toLowerCase())
      ),
    [machines, search]
  );

  const onSave = async (values) => {
    try {
      setSaving(true);
      const payload = { ...values, imageUrl: normalizeImageUrl(values.imageUrl) };
      if (editing) {
        await editMachine(editing.id, payload);
        showSnackbar("Machine updated", "success");
      } else {
        await createMachine(payload);
        showSnackbar("Machine created", "success");
      }
      setVisible(false);
      setEditing(null);
      reset({ name: "", code: "", expectedOutputPerHour: "", imageUrl: "" });
      await loadMachines();
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    try {
      await removeMachine(id);
      showSnackbar("Machine deleted", "success");
      await loadMachines();
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  return (
    <ScreenContainer>
      <AnimatedInput label="Search machine" value={search} onChangeText={setSearch} style={styles.search} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState text="No machines found." />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadMachines();
              setRefreshing(false);
            }}
          />
        }
        renderItem={({ item }) => (
          <GlassCard>
            <View style={styles.row}>
              <RemoteImage uri={item.imageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.thumb} />
              <View style={styles.rowContent}>
                <Text style={[styles.name, { color: theme.colors.onSurface }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Code: {item.code}</Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>
              Expected/hour: {item.expectedOutputPerHour}
            </Text>
            <View style={styles.actions}>
              <Button
                mode="contained-tonal"
                style={styles.actionBtn}
                onPress={() => {
                  setEditing(item);
                  reset({
                    name: item.name,
                    code: item.code,
                    expectedOutputPerHour: String(item.expectedOutputPerHour),
                    imageUrl: normalizeImageUrl(item.imageUrl || "")
                  });
                  setVisible(true);
                }}
              >
                Edit
              </Button>
              <Button textColor={theme.custom.colors.error} style={styles.actionBtn} onPress={() => onDelete(item.id)}>
                Delete
              </Button>
            </View>
          </GlassCard>
        )}
      />

      <Portal>
        <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ borderRadius: 14 }}>
          <Dialog.Title>{editing ? "Edit Machine" : "Add Machine"}</Dialog.Title>
          <Dialog.Content>
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormTextField control={control} name="name" label="Machine Name" autoCapitalize="words" />
              <FormTextField control={control} name="code" label="Machine Code" autoCapitalize="characters" />
              <FormTextField control={control} name="imageUrl" label="Machine Image URL" keyboardType="url" />
              <View style={styles.urlActions}>
                <Button
                  compact
                  mode="text"
                  onPress={() => setValue("imageUrl", normalizeImageUrl(selectedImageUrl), { shouldValidate: true })}
                >
                  Normalize URL
                </Button>
                <Button compact mode="text" textColor={theme.custom.colors.error} onPress={() => setValue("imageUrl", "", { shouldValidate: true })}>
                  Clear
                </Button>
              </View>
              <View style={styles.previewRow}>
                <View style={[styles.previewWrap, { backgroundColor: theme.colors.surface }]}>
                  <RemoteImage uri={previewImageUrl} fallbackSource={MACHINE_PLACEHOLDER} style={styles.previewImage} />
                </View>
                <View style={styles.previewTextWrap}>
                  <Text style={[styles.previewLabel, { color: theme.colors.onSurface }]}>Live preview</Text>
                  <Text style={[styles.previewHint, { color: theme.custom.colors.textMuted }]}>
                    Public URL only (Google Drive links are auto-converted)
                  </Text>
                  {isEditing ? (
                    <Text style={[styles.previewHint, { color: theme.colors.primary }]}>Editing machine: {editing?.code}</Text>
                  ) : null}
                </View>
              </View>
              <FormTextField
                control={control}
                name="expectedOutputPerHour"
                label="Expected Output/Hour"
                keyboardType="numeric"
              />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button onPress={handleSubmit(onSave)} loading={saving} disabled={saving}>
              {isEditing ? "Update" : "Save"}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color="#FFFFFF"
        onPress={() => {
          setEditing(null);
          reset({ name: "", code: "", expectedOutputPerHour: "", imageUrl: "" });
          setVisible(true);
        }}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  search: {
    marginBottom: 10
  },
  list: {
    paddingBottom: 120
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  rowContent: {
    flex: 1
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#E2E8F0"
  },
  meta: {
    fontSize: 14,
    marginBottom: 2
  },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  actionBtn: {
    borderRadius: 10
  },
  formScroll: {
    maxHeight: 420
  },
  formContent: {
    paddingBottom: 6
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10
  },
  urlActions: {
    marginTop: -2,
    marginBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  previewWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#94A3B8",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#E2E8F0"
  },
  previewTextWrap: {
    flex: 1
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "500"
  },
  previewHint: {
    marginTop: 2,
    fontSize: 12
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 86
  }
});

const MACHINE_PLACEHOLDER = require("../../../assets/logo.png");

export default ManageMachinesScreen;
