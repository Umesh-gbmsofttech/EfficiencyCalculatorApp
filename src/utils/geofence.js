export const toRadians = (degrees) => (degrees * Math.PI) / 180;

export const getDistanceMeters = (from, to) => {
  if (!from || !to) return null;
  const earthRadius = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

export const isWithinRadius = ({ from, target, radiusMeters }) => {
  const distance = getDistanceMeters(from, target);
  if (distance == null) return false;
  return distance <= Number(radiusMeters || 0);
};
