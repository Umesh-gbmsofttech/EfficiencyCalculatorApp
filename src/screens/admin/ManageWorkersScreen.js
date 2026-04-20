import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Dialog, FAB, Menu, Portal, useTheme } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import FormTextField from "../../components/FormTextField";
import EmptyState from "../../components/EmptyState";
import AnimatedInput from "../../components/AnimatedInput";
import GlassCard from "../../components/GlassCard";
import ScreenContainer from "../../components/ScreenContainer";
import { adminCreateWorkerSchema, workerSchema } from "../../utils/validationSchemas";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { deleteWorker, getWorkers, updateWorker } from "../../services/firebase/firestore";
import { adminCreateWorker } from "../../services/firebase/auth";

const ManageWorkersScreen = () => {
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [roleMenu, setRoleMenu] = useState(false);
  const [createRoleMenu, setCreateRoleMenu] = useState(false);
  const [editing, setEditing] = useState(null);
  const { showSnackbar } = useUIStore();
  const theme = useTheme();

  const {
    control,
    reset,
    handleSubmit,
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(workerSchema),
    defaultValues: { fullName: "", phoneNumber: "", role: "worker" }
  });
  const selectedRole = watch("role");

  const {
    control: createControl,
    reset: resetCreate,
    handleSubmit: handleCreateSubmit,
    setValue: setCreateValue,
    watch: watchCreate
  } = useForm({
    resolver: yupResolver(adminCreateWorkerSchema),
    defaultValues: { fullName: "", email: "", phoneNumber: "", password: "", role: "worker" }
  });
  const selectedCreateRole = watchCreate("role");

  const loadWorkers = useCallback(async () => {
    try {
      const response = await getWorkers();
      setWorkers(response);
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const filtered = useMemo(
    () =>
      workers.filter(
        (worker) =>
          worker.fullName.toLowerCase().includes(search.toLowerCase()) ||
          worker.email.toLowerCase().includes(search.toLowerCase())
      ),
    [workers, search]
  );

  const onSave = async (values) => {
    try {
      if (!editing) return;
      await updateWorker(editing.id, values);
      showSnackbar("Worker updated", "success");
      setEditVisible(false);
      await loadWorkers();
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  const onCreate = async (values) => {
    try {
      await adminCreateWorker(values);
      showSnackbar("Worker account created", "success");
      setCreateVisible(false);
      resetCreate({ fullName: "", email: "", phoneNumber: "", password: "", role: "worker" });
      await loadWorkers();
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  const onDelete = async (id) => {
    try {
      await deleteWorker(id);
      showSnackbar("Worker deactivated", "success");
      await loadWorkers();
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
    }
  };

  return (
    <ScreenContainer>
      <AnimatedInput label="Search worker" value={search} onChangeText={setSearch} style={styles.search} />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState text="No workers found." />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadWorkers();
              setRefreshing(false);
            }}
          />
        }
        renderItem={({ item }) => (
          <GlassCard>
            <Text style={[styles.name, { color: theme.colors.onSurface }]}>{item.fullName}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{item.email}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>{item.phoneNumber}</Text>
            <Text style={[styles.meta, { color: theme.custom.colors.textMuted }]}>Role: {item.role}</Text>
            <View style={styles.actions}>
              <Button
                mode="contained-tonal"
                onPress={() => {
                  setEditing(item);
                  reset({
                    fullName: item.fullName,
                    phoneNumber: item.phoneNumber,
                    role: item.role || "worker"
                  });
                  setEditVisible(true);
                }}
              >
                Edit
              </Button>
              <Button textColor={theme.custom.colors.error} onPress={() => onDelete(item.id)}>
                Delete
              </Button>
            </View>
          </GlassCard>
        )}
      />

      <Portal>
        <Dialog visible={editVisible} onDismiss={() => setEditVisible(false)} style={styles.dialog}>
          <Dialog.Title>Edit Worker</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <FormTextField control={control} name="fullName" label="Full Name" autoCapitalize="words" />
              <FormTextField control={control} name="phoneNumber" label="Phone Number" keyboardType="phone-pad" />
              <Menu
                visible={roleMenu}
                onDismiss={() => setRoleMenu(false)}
                anchor={
                  <Button mode="outlined" onPress={() => setRoleMenu(true)} style={styles.roleBtn}>
                    Role: {selectedRole}
                  </Button>
                }
              >
                <Menu.Item
                  title="worker"
                  onPress={() => {
                    setValue("role", "worker");
                    setRoleMenu(false);
                  }}
                />
                <Menu.Item
                  title="admin"
                  onPress={() => {
                    setValue("role", "admin");
                    setRoleMenu(false);
                  }}
                />
              </Menu>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditVisible(false)}>Cancel</Button>
            <Button onPress={handleSubmit(onSave)}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={createVisible} onDismiss={() => setCreateVisible(false)} style={styles.dialog}>
          <Dialog.Title>Add Worker</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <FormTextField control={createControl} name="fullName" label="Full Name" autoCapitalize="words" />
              <FormTextField control={createControl} name="email" label="Email" keyboardType="email-address" />
              <FormTextField
                control={createControl}
                name="phoneNumber"
                label="Phone Number"
                keyboardType="phone-pad"
              />
              <FormTextField control={createControl} name="password" label="Password" secureTextEntry />
              <Menu
                visible={createRoleMenu}
                onDismiss={() => setCreateRoleMenu(false)}
                anchor={
                  <Button mode="outlined" onPress={() => setCreateRoleMenu(true)} style={styles.roleBtn}>
                    Role: {selectedCreateRole}
                  </Button>
                }
              >
                <Menu.Item
                  title="worker"
                  onPress={() => {
                    setCreateValue("role", "worker");
                    setCreateRoleMenu(false);
                  }}
                />
                <Menu.Item
                  title="admin"
                  onPress={() => {
                    setCreateValue("role", "admin");
                    setCreateRoleMenu(false);
                  }}
                />
              </Menu>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateSubmit(onCreate)}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB icon="plus" style={[styles.fab, { backgroundColor: theme.colors.primary }]} color="#FFFFFF" onPress={() => setCreateVisible(true)} />
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
  meta: {
    fontSize: 14,
    marginBottom: 2
  },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  dialog: {
    borderRadius: 14
  },
  roleBtn: {
    borderRadius: 10,
    marginTop: 6
  },
  formScroll: {
    maxHeight: 420
  },
  formContent: {
    paddingBottom: 6
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 86
  }
});

export default ManageWorkersScreen;
