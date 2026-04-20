import { useCallback, useEffect, useState } from "react";
import { getLogsPage } from "../services/firebase/firestore";
import useUIStore from "../store/uiStore";
import { mapErrorMessage } from "../utils/errorMapper";

const usePaginatedLogs = ({ role, uid, filters, enabled = true }) => {
  const { showSnackbar } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [filterKey, setFilterKey] = useState(JSON.stringify(filters || {}));

  useEffect(() => {
    setFilterKey(JSON.stringify(filters || {}));
  }, [filters]);

  const shouldSilenceError = useCallback((error) => {
    const code = error?.code || "";
    return code === "permission-denied" || code === "failed-precondition";
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setRefreshing(true);
    try {
      const response = await getLogsPage({ role, uid, filters, cursor: null });
      console.info("[Logs] refresh", { uid: uid || "all", role, resultCount: response.records.length });
      setRecords(response.records);
      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (error) {
      if (!shouldSilenceError(error)) {
        showSnackbar(mapErrorMessage(error), "error");
      }
      setRecords([]);
      setCursor(null);
      setHasMore(false);
    }
    setRefreshing(false);
  }, [enabled, filters, role, shouldSilenceError, showSnackbar, uid]);

  const loadMore = useCallback(async () => {
    if (!enabled || loading || !hasMore) return;
    try {
      setLoading(true);
      const response = await getLogsPage({ role, uid, filters, cursor });
      console.info("[Logs] loadMore", { uid: uid || "all", role, resultCount: response.records.length });
      setRecords((prev) => [...prev, ...response.records]);
      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (error) {
      if (!shouldSilenceError(error)) {
        showSnackbar(mapErrorMessage(error), "error");
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [cursor, enabled, filters, hasMore, loading, role, shouldSilenceError, showSnackbar, uid]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    const loadInitial = async () => {
      try {
        setLoading(true);
        const response = await getLogsPage({ role, uid, filters, cursor: null });
        console.info("[Logs] loadInitial", { uid: uid || "all", role, resultCount: response.records.length });
        if (!mounted) return;
        setRecords(response.records);
        setCursor(response.cursor);
        setHasMore(response.hasMore);
      } catch (error) {
        if (mounted) {
          if (!shouldSilenceError(error)) {
            showSnackbar(mapErrorMessage(error), "error");
          }
          setRecords([]);
          setCursor(null);
          setHasMore(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitial();

    return () => {
      mounted = false;
    };
  }, [enabled, filterKey, filters, role, shouldSilenceError, showSnackbar, uid]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setRefreshing(false);
      setRecords([]);
      setCursor(null);
      setHasMore(true);
    }
  }, [enabled]);

  return { records, loading, refreshing, hasMore, loadMore, refresh };
};

export default usePaginatedLogs;

