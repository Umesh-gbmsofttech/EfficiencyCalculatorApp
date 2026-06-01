import { useCallback, useEffect, useRef, useState } from "react";
import logRepository from "../repositories/logRepository";
import useUIStore from "../store/uiStore";
import { mapErrorMessage } from "../utils/errorMapper";
import { logInfo } from "../utils/logger";

const usePaginatedLogs = ({ role, uid, filters, enabled = true }) => {
  const { showSnackbar } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [filterKey, setFilterKey] = useState(JSON.stringify(filters || {}));
  const requestRef = useRef(0);
  const filtersRef = useRef(filters || {});

  useEffect(() => {
    const nextFilters = filters || {};
    filtersRef.current = nextFilters;
    setFilterKey(JSON.stringify(nextFilters));
  }, [filters]);

  const shouldSilenceError = useCallback((error) => {
    const code = error?.code || "";
    return code === "permission-denied" || code === "failed-precondition";
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    requestRef.current += 1;
    const reqId = requestRef.current;
    setRefreshing(true);
    try {
      const response = await logRepository.getPage({ role, uid, filters: filtersRef.current, cursor: null });
      logInfo("Logs", "refresh", { uid: uid || "all", role, resultCount: response.records.length });
      if (reqId !== requestRef.current) return;
      setRecords(response.records);
      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (error) {
      if (reqId !== requestRef.current) return;
      if (!shouldSilenceError(error)) {
        showSnackbar(mapErrorMessage(error), "error");
      }
      setRecords([]);
      setCursor(null);
      setHasMore(false);
    } finally {
      if (reqId === requestRef.current) setRefreshing(false);
    }
  }, [enabled, role, shouldSilenceError, showSnackbar, uid]);

  const loadMore = useCallback(async () => {
    if (!enabled || loading || !hasMore) return;
    requestRef.current += 1;
    const reqId = requestRef.current;
    try {
      setLoading(true);
      const response = await logRepository.getPage({ role, uid, filters: filtersRef.current, cursor });
      logInfo("Logs", "loadMore", { uid: uid || "all", role, resultCount: response.records.length });
      if (reqId !== requestRef.current) return;
      setRecords((prev) => [...prev, ...response.records]);
      setCursor(response.cursor);
      setHasMore(response.hasMore);
    } catch (error) {
      if (reqId !== requestRef.current) return;
      if (!shouldSilenceError(error)) {
        showSnackbar(mapErrorMessage(error), "error");
      }
      setHasMore(false);
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, [cursor, enabled, hasMore, loading, role, shouldSilenceError, showSnackbar, uid]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    const loadInitial = async () => {
      try {
        requestRef.current += 1;
        const reqId = requestRef.current;
        setLoading(true);
        const response = await logRepository.getPage({ role, uid, filters: filtersRef.current, cursor: null });
        logInfo("Logs", "loadInitial", { uid: uid || "all", role, resultCount: response.records.length });
        if (!mounted || reqId !== requestRef.current) return;
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
  }, [enabled, filterKey, role, shouldSilenceError, showSnackbar, uid]);

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

