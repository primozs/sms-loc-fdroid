/** Great-circle distance in meters between two [lon, lat] points. */
export const distanceMeters = (
  a: [number, number] | number[],
  b: [number, number] | number[],
) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const sLat1 = toRad(lat1);
  const sLat2 = toRad(lat2);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(sLat1) * Math.cos(sLat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

export function toStringDD(
  [lon, lat]: [number, number] | number[],
  fractionDigits: number | undefined = 1,
) {
  const NS = lat < 0 ? 'S' : 'N';
  const EW = lon < 0 ? 'W' : 'E';
  return `${NS}${Math.abs(lat)
    .toFixed(fractionDigits)
    .padStart(7, '0')}°, ${EW}${Math.abs(lon)
    .toFixed(fractionDigits)
    .padStart(8, '0')}°`;
}

export const formatLength = function (
  a: [number, number] | number[],
  b: [number, number] | number[],
) {
  const length = distanceMeters(a, b);
  if (length > 100) {
    return Math.round((length / 1000) * 100) / 100 + ' km';
  }
  return Math.round(length * 100) / 100 + ' m';
};

export const formatName = (name: string | undefined) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export const formatDayTime = (date: Date | null | undefined, locale = 'en') => {
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};
