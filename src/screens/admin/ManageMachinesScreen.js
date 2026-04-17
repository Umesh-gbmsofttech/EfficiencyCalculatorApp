import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Button, Card, Dialog, FAB, Portal, Text, TextInput } from "react-native-paper";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import FormTextField from "../../components/FormTextField";
import EmptyState from "../../components/EmptyState";
import { machineSchema } from "../../utils/validationSchemas";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";
import { createMachine, editMachine, getMachines, removeMachine } from "../../services/firebase/firestore";

const ManageMachinesScreen = () => {
  const [machines, setMachines] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const { showSnackbar } = useUIStore();

  const { control, reset, handleSubmit } = useForm({
    resolver: yupResolver(machineSchema),
    defaultValues: { name: "", code: "", expectedOutputPerHour: "" }
  });

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
      if (editing) {
        await editMachine(editing.id, values);
        showSnackbar("Machine updated", "success");
      } else {
        await createMachine(values);
        showSnackbar("Machine created", "success");
      }
      setVisible(false);
      setEditing(null);
      reset({ name: "", code: "", expectedOutputPerHour: "" });
      await loadMachines();
    } catch (error) {
      showSnackbar(mapErrorMessage(error), "error");
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
    <View style={{ flex: 1, padding: 12 }}>
      <TextInput
        mode="outlined"
        label="Search machine"
        value={search}
        onChangeText={setSearch}
        style={{ marginBottom: 10 }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<EmptyState text="No machines found." />}
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
          <Card style={{ marginBottom: 10 }}>
            <Card.Content>
              <Text variant="titleMedium">{item.name}</Text>
              <Text>Code: {item.code}</Text>
              <Text>Expected/hour: {item.expectedOutputPerHour}</Text>
            </Card.Content>
            <Card.Actions>
              <Button
                onPress={() => {
                  setEditing(item);
                  reset({
                    name: item.name,
                    code: item.code,
                    expectedOutputPerHour: String(item.expectedOutputPerHour)
                  });
                  setVisible(true);
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
        <Dialog visible={visible} onDismiss={() => setVisible(false)}>
          <Dialog.Title>{editing ? "Edit Machine" : "Add Machine"}</Dialog.Title>
          <Dialog.Content>
            <FormTextField control={control} name="name" label="Machine Name" />
            <FormTextField control={control} name="code" label="Machine Code" />
            <FormTextField
              control={control}
              name="expectedOutputPerHour"
              label="Expected Output/Hour"
              keyboardType="numeric"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setVisible(false)}>Cancel</Button>
            <Button onPress={handleSubmit(onSave)}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FAB
        icon="plus"
        style={{ position: "absolute", right: 16, bottom: 16 }}
        onPress={() => {
          setEditing(null);
          reset({ name: "", code: "", expectedOutputPerHour: "" });
          setVisible(true);
        }}
      />
    </View>
  );
};

export default ManageMachinesScreen;
