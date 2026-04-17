import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Button, Card, Dialog, FAB, Menu, Portal, Text, TextInput } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import FormTextField from "../../components/FormTextField";
import EmptyState from "../../components/EmptyState";
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
    <View style={{ flex: 1, padding: 12 }}>
      <TextInput
        mode="outlined"
        label="Search worker"
        value={search}
        onChangeText={setSearch}
        style={{ marginBottom: 10 }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState text="No workers found." />}
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
          <Card style={{ marginBottom: 10 }}>
            <Card.Content>
              <Text variant="titleMedium">{item.fullName}</Text>
              <Text>{item.email}</Text>
              <Text>{item.phoneNumber}</Text>
              <Text>Role: {item.role}</Text>
            </Card.Content>
            <Card.Actions>
              <Button
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
              <Button textColor="#B00020" onPress={() => onDelete(item.id)}>
                Delete
              </Button>
            </Card.Actions>
          </Card>
        )}
      />

      <Portal>
        <Dialog visible={editVisible} onDismiss={() => setEditVisible(false)}>
          <Dialog.Title>Edit Worker</Dialog.Title>
          <Dialog.Content>
            <FormTextField control={control} name="fullName" label="Full Name" />
            <FormTextField control={control} name="phoneNumber" label="Phone Number" keyboardType="phone-pad" />
            <Menu
              visible={roleMenu}
              onDismiss={() => setRoleMenu(false)}
              anchor={
                <Button mode="outlined" onPress={() => setRoleMenu(true)}>
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditVisible(false)}>Cancel</Button>
            <Button onPress={handleSubmit(onSave)}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={createVisible} onDismiss={() => setCreateVisible(false)}>
          <Dialog.Title>Add Worker</Dialog.Title>
          <Dialog.Content>
            <FormTextField control={createControl} name="fullName" label="Full Name" />
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
                <Button mode="outlined" onPress={() => setCreateRoleMenu(true)}>
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateVisible(false)}>Cancel</Button>
            <Button onPress={handleCreateSubmit(onCreate)}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB icon="plus" style={{ position: "absolute", right: 16, bottom: 16 }} onPress={() => setCreateVisible(true)} />
    </View>
  );
};

export default ManageWorkersScreen;
