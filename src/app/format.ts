import { getLength } from 'ol/sphere';
import type { LineString } from 'ol/geom';

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

export const formatLength = function (line: LineString) {
  const length = getLength(line);
  let output;
  if (length > 100) {
    output = Math.round((length / 1000) * 100) / 100 + ' km';
  } else {
    output = Math.round(length * 100) / 100 + ' m';
  }
  return output;
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
