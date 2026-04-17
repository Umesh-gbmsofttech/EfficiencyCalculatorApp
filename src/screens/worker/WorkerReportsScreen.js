import React, { useMemo, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";
import useAuthStore from "../../store/authStore";
import usePaginatedLogs from "../../hooks/usePaginatedLogs";
import EmptyState from "../../components/EmptyState";
import { formatDateTime, formatPercent } from "../../utils/formatters";

const WorkerReportsScreen = () => {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const baseFilters = useMemo(() => ({}), []);

  const { records, loading, refreshing, hasMore, loadMore, refresh } = usePaginatedLogs({
    role: "worker",
    uid: user?.uid,
    filters: baseFilters,
    enabled: Boolean(user?.uid)
  });

  const visibleRecords = useMemo(() => {
    if (!search.trim()) return records;
    const s = search.toLowerCase();
    return records.filter((item) => item.machineName?.toLowerCase().includes(s));
  }, [records, search]);

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <TextInput
        mode="outlined"
        label="Search by machine"
        value={search}
        onChangeText={setSearch}
        style={{ marginBottom: 10 }}
      />
      <FlatList
        data={visibleRecords}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={loading ? null : <EmptyState text="No reports found." />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <Card.Content>
              <Text variant="titleSmall">{item.machineName}</Text>
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

export default WorkerReportsScreen;
