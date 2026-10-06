import SunCalc from 'suncalc';
import type { Point, ShadowResult } from './schema';
export const normalize = (v: number) => ((v % 360) + 360) % 360;
export const angularDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
export function estimateTime(options: {
  points: Point[];
  width: number;
  height: number;
  north: number;
  latitude: number;
  longitude: number;
  date: string;
  offset: number;
  tolerance: number;
}): ShadowResult | null {
  const { points, width, height, north, latitude, longitude, date, offset, tolerance } = options;
  if (
    points.length !== 3 ||
    points.some(
      (p) =>
        !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1,
    ) ||
    ![width, height, north, latitude, longitude, offset, tolerance].every(Number.isFinite) ||
    north < 0 ||
    north > 360 ||
    width <= 0 ||
    height <= 0 ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180 ||
    offset < -12 ||
    offset > 14 ||
    tolerance < 1 ||
    tolerance > 30
  )
    throw new Error('Enter valid coordinates, UTC offset, and three measurement points.');
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date
  )
    throw new Error('Choose a valid date.');
  const [base, objectTip, shadowTip] = points;
  const dx = (shadowTip.x - base.x) * width,
    dy = (shadowTip.y - base.y) * height;
  if (
    Math.hypot(dx, dy) < 5 ||
    Math.hypot((objectTip.x - base.x) * width, (objectTip.y - base.y) * height) < 5
  )
    throw new Error('Choose distinct points at least 5 image pixels apart.');
  const shadowBearing = normalize((Math.atan2(dx, -dy) * 180) / Math.PI - north);
  const start = Date.parse(date + 'T00:00:00Z') - offset * 3_600_000;
  const candidates: { utc: string; altitude: number; azimuth: number; error: number }[] = [];
  for (let minute = 0; minute < 1440; minute++) {
    const time = new Date(start + minute * 60_000);
    const sun = SunCalc.getPosition(time, latitude, longitude);
    const altitude = (sun.altitude * 180) / Math.PI;
    const azimuth = normalize((sun.azimuth * 180) / Math.PI + 180);
    const error = angularDistance(normalize(azimuth + 180), shadowBearing);
    if (altitude > 0 && error <= tolerance)
      candidates.push({ utc: time.toISOString(), altitude, azimuth, error });
  }
  if (!candidates.length) return null;
  const best = candidates.reduce((a, b) => (a.error < b.error ? a : b));
  return {
    ...best,
    shadowBearing,
    north,
    latitude,
    longitude,
    date,
    offset,
    tolerance,
    matches: candidates.length,
    windowStart: candidates[0].utc,
    windowEnd: candidates[candidates.length - 1].utc,
  };
}
