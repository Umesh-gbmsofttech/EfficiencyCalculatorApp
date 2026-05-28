import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Linking } from "react-native";
import * as Location from "expo-location";
import { getDistanceMeters, isWithinRadius } from "../utils/geofence";
import { FEATURES } from "../config/features";

const CompanyConfigContext = createContext(null);

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};


export const CompanyConfigProvider = ({ children, locationRestrictionEnabled = FEATURES.LOCATION_RESTRICTION }) => {
  const companyLocation = useMemo(
    () => ({
      latitude: toNumber(process.env.EXPO_PUBLIC_COMPANY_LATITUDE, 0),
      longitude: toNumber(process.env.EXPO_PUBLIC_COMPANY_LONGITUDE, 0),
      radiusMeters: toNumber(process.env.EXPO_PUBLIC_COMPANY_RADIUS_METERS, 200)
    }),
    []
  );
  const [permissionStatus, setPermissionStatus] = useState(locationRestrictionEnabled ? "undetermined" : "granted");
  const [servicesEnabled, setServicesEnabled] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);

  const refreshLocation = useCallback(async () => {
    if (!locationRestrictionEnabled) {
      setPermissionStatus("granted");
      setServicesEnabled(true);
      setCurrentLocation(null);
      setIsRefreshingLocation(false);
      return { ok: true, bypassed: true };
    }
    try {
      setIsRefreshingLocation(true);
      const service = await Location.hasServicesEnabledAsync();
      setServicesEnabled(Boolean(service));

      const permission = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(permission.status);
      if (permission.status !== "granted" || !service) return { ok: false, reason: !service ? "services-disabled" : "permission-denied" };

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      setCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || null,
        timestamp: position.timestamp || Date.now()
      });
      return { ok: true };
    } catch (error) {
      setCurrentLocation(null);
      return { ok: false, reason: error?.code || "location-unavailable" };
    } finally {
      setIsRefreshingLocation(false);
    }
  }, [locationRestrictionEnabled]);

  const requestLocationAccess = useCallback(async () => {
    if (!locationRestrictionEnabled) {
      setPermissionStatus("granted");
      setServicesEnabled(true);
      return { ok: true, bypassed: true };
    }
    const service = await Location.hasServicesEnabledAsync();
    setServicesEnabled(Boolean(service));
    if (!service) return { ok: false, reason: "services-disabled" };

    const permission = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(permission.status);
    if (permission.status !== "granted") return { ok: false, reason: "permission-denied" };

    await refreshLocation();
    return { ok: true };
  }, [locationRestrictionEnabled, refreshLocation]);

  const openDeviceLocationSettings = useCallback(async () => {
    if (!locationRestrictionEnabled) return { ok: true, bypassed: true };
    await Linking.openSettings();
    return { ok: true };
  }, [locationRestrictionEnabled]);

  useEffect(() => {
    if (!locationRestrictionEnabled) {
      setPermissionStatus("granted");
      setServicesEnabled(true);
      setCurrentLocation(null);
      setIsRefreshingLocation(false);
      return undefined;
    }
    refreshLocation();
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        refreshLocation();
      }
    });
    return () => sub.remove();
  }, [locationRestrictionEnabled, refreshLocation]);

  const distanceFromCompanyMeters = useMemo(() => {
    if (!currentLocation) return null;
    return getDistanceMeters(currentLocation, companyLocation);
  }, [companyLocation, currentLocation]);

  const isInsideCompanyRadius = useMemo(() => {
    if (!locationRestrictionEnabled) return true;
    return isWithinRadius({ from: currentLocation, target: companyLocation, radiusMeters: companyLocation.radiusMeters });
  }, [companyLocation, currentLocation, locationRestrictionEnabled]);

  const value = useMemo(
    () => ({
      companyLocation,
      locationRestrictionEnabled,
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
      locationRestrictionEnabled,
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
