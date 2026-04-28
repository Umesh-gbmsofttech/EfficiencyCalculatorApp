import { useMemo } from "react";
import { useCompanyConfig } from "../context/companyConfig";

const useGeoFence = () => {
  const {
    distanceFromCompanyMeters,
    isInsideCompanyRadius,
    isRefreshingLocation,
    permissionStatus,
    servicesEnabled,
    requestLocationAccess,
    refreshLocation,
    openDeviceLocationSettings
  } = useCompanyConfig();

  const error = useMemo(() => {
    if (permissionStatus !== "granted") return "permission-denied";
    if (!servicesEnabled) return "services-disabled";
    if (distanceFromCompanyMeters == null) return "location-unavailable";
    if (!isInsideCompanyRadius) return "outside-radius";
    return null;
  }, [distanceFromCompanyMeters, isInsideCompanyRadius, permissionStatus, servicesEnabled]);

  return {
    isInsideRadius: Boolean(isInsideCompanyRadius),
    distance: distanceFromCompanyMeters == null ? null : Number(distanceFromCompanyMeters),
    loading: Boolean(isRefreshingLocation),
    error,
    requestLocationAccess,
    refreshLocation,
    openDeviceLocationSettings
  };
};

export default useGeoFence;
