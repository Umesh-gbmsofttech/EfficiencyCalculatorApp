export const FEATURES = {
  // Toggle this to true for production geofencing and location-protected actions.
  LOCATION_RESTRICTION: false
};

export const isFeatureEnabled = (featureName) => Boolean(FEATURES[featureName]);
