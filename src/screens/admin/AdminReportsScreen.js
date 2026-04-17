import React, { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import ReportFilters from "../../components/ReportFilters";
import EmptyState from "../../components/EmptyState";
import useAuthStore from "../../store/authStore";
import { getMachines, getWorkers } from "../../services/firebase/firestore";
import usePaginatedLogs from "../../hooks/usePaginatedLogs";
import { formatDateTime, formatPercent } from "../../utils/formatters";
import useUIStore from "../../store/uiStore";
import { mapErrorMessage } from "../../utils/errorMapper";

const AdminReportsScreen = () => {
  const { user } = useAuthStore();
  const { showSnackbar } = useUIStore();
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [workerMenu, setWorkerMenu] = useState(false);
  const [machineMenu, setMachineMenu] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    workerId: "",
    machineId: "",
    dateFrom: "",
    dateTo: ""
  });

  const { records, loading, refreshing, hasMore, loadMore, refresh } = usePaginatedLogs({
    role: "admin",
    uid: user?.uid,
    filters,
    enabled: Boolean(user?.uid)
  });

  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [workerData, machineData] = await Promise.all([getWorkers(), getMachines()]);
        setWorkers(workerData);
        setMachines(machineData);
      } catch (error) {
        showSnackbar(mapErrorMessage(error), "error");
      }
    };
    loadFilterData();
  }, [showSnackbar]);

  const visibleRecords = useMemo(() => {
    if (!filters.search.trim()) return records;
    const search = filters.search.toLowerCase();
    return records.filter(
      (item) =>
        item.workerName?.toLowerCase().includes(search) ||
        item.machineName?.toLowerCase().includes(search)
    );
  }, [records, filters.search]);

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <ReportFilters
        workers={workers}
        machines={machines}
        filters={filters}
        workerMenu={workerMenu}
        setWorkerMenu={setWorkerMenu}
        machineMenu={machineMenu}
        setMachineMenu={setMachineMenu}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
      />

      <FlatList
        data={visibleRecords}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={loading ? null : <EmptyState text="No reports found." />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <Card.Content>
              <Text variant="titleSmall">{item.workerName}</Text>
              <Text>Machine: {item.machineName}</Text>
              <Text>Hours: {item.workingHours} | Output: {item.outputProduced}</Text>
              <Text>Downtime: {item.downtime} | Expected: {item.expectedOutput}</Text>
              <Text>Efficiency: {formatPercent(item.efficiency)}</Text>
              <Text>{formatDateTime(item.timestamp)}</Text>
            </Card.Content>
          </Card>
        )}
        ListFooterComponent={
          hasMore ? (
            <Button loading={loading} onPress={loadMore}>
              Load More
            </Button>
          ) : null
        }
      />
    </View>
  );
};

export default AdminReportsScreen;
