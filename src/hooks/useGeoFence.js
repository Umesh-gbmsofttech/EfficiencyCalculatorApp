import { useMemo } from "react";
import { useCompanyConfig } from "../context/companyConfig";

const useGeoFence = () => {
  const {
    locationRestrictionEnabled,
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
    if (!locationRestrictionEnabled) return null;
    if (permissionStatus !== "granted") return "permission-denied";
    if (!servicesEnabled) return "services-disabled";
    if (distanceFromCompanyMeters == null) return "location-unavailable";
    if (!isInsideCompanyRadius) return "outside-radius";
    return null;
  }, [distanceFromCompanyMeters, isInsideCompanyRadius, locationRestrictionEnabled, permissionStatus, servicesEnabled]);

  return {
    enabled: Boolean(locationRestrictionEnabled),
    isInsideRadius: locationRestrictionEnabled ? Boolean(isInsideCompanyRadius) : true,
    distance: distanceFromCompanyMeters == null ? null : Number(distanceFromCompanyMeters),
    loading: locationRestrictionEnabled ? Boolean(isRefreshingLocation) : false,
    error,
    requestLocationAccess,
    refreshLocation,
    openDeviceLocationSettings
  };
};

export default useGeoFence;
