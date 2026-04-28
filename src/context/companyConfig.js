import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Linking } from "react-native";
import * as Location from "expo-location";

const CompanyConfigContext = createContext(null);

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const haversineDistanceMeters = (from, to) => {
  if (!from || !to) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(to.latitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return r * c;
};

export const CompanyConfigProvider = ({ children }) => {
  const companyLocation = useMemo(
    () => ({
      latitude: toNumber(process.env.EXPO_PUBLIC_COMPANY_LATITUDE, 0),
      longitude: toNumber(process.env.EXPO_PUBLIC_COMPANY_LONGITUDE, 0),
      radiusMeters: toNumber(process.env.EXPO_PUBLIC_COMPANY_RADIUS_METERS, 200)
    }),
    []
  );
  const [permissionStatus, setPermissionStatus] = useState("undetermined");
  const [servicesEnabled, setServicesEnabled] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  const refreshLocation = useCallback(async () => {
    try {
      setIsRefreshingLocation(true);
      const service = await Location.hasServicesEnabledAsync();
      setServicesEnabled(Boolean(service));

      const permission = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(permission.status);
      if (permission.status !== "granted" || !service) return;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || null,
        timestamp: position.timestamp || Date.now()
      });
    } finally {
      setIsRefreshingLocation(false);
    }
  }, []);

  const requestLocationAccess = useCallback(async () => {
    const service = await Location.hasServicesEnabledAsync();
    setServicesEnabled(Boolean(service));
    if (!service) return { ok: false, reason: "services-disabled" };

    const permission = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(permission.status);
    if (permission.status !== "granted") return { ok: false, reason: "permission-denied" };

    await refreshLocation();
    return { ok: true };
  }, [refreshLocation]);

  const openDeviceLocationSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  useEffect(() => {
    refreshLocation();
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshLocation();
      }
    });
    return () => sub.remove();
  }, [refreshLocation]);

  const distanceFromCompanyMeters = useMemo(() => {
    if (!currentLocation) return null;
    return haversineDistanceMeters(currentLocation, companyLocation);
  }, [companyLocation, currentLocation]);

  const isInsideCompanyRadius = useMemo(() => {
    if (distanceFromCompanyMeters == null) return false;
    return distanceFromCompanyMeters <= companyLocation.radiusMeters;
  }, [companyLocation.radiusMeters, distanceFromCompanyMeters]);

  const value = useMemo(
    () => ({
      companyLocation,
      permissionStatus,
      servicesEnabled,
      currentLocation,
      isRefreshingLocation,
      distanceFromCompanyMeters,
      isInsideCompanyRadius,
      requestLocationAccess,
      refreshLocation,
      openDeviceLocationSettings
    }),
    [
      companyLocation,
      currentLocation,
      distanceFromCompanyMeters,
      isInsideCompanyRadius,
      isRefreshingLocation,
      openDeviceLocationSettings,
      permissionStatus,
      refreshLocation,
      requestLocationAccess,
      servicesEnabled
    ]
  );

  return <CompanyConfigContext.Provider value={value}>{children}</CompanyConfigContext.Provider>;
};

export const useCompanyConfig = () => {
  const context = useContext(CompanyConfigContext);
  if (!context) {
    throw new Error("useCompanyConfig must be used inside CompanyConfigProvider");
  }
  return context;
};
