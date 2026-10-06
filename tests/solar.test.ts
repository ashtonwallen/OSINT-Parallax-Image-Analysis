import { test } from 'node:test';
import assert from 'node:assert/strict';
import SunCalc from 'suncalc';
import { estimateTime, normalize, angularDistance } from '../src/lib/solar';
const candidate = {
  width: 1000,
  height: 600,
  north: 23,
  latitude: 38.7107,
  longitude: -9.1355,
  date: '2026-06-21',
  offset: 1,
  tolerance: 2,
};
test('recovers a known solar time using aspect-corrected points and a north calibration', () => {
  const known = new Date('2026-06-21T09:30:00Z');
  const sun = SunCalc.getPosition(known, candidate.latitude, candidate.longitude);
  const bearing = normalize((sun.azimuth * 180) / Math.PI + 360);
  const angle = ((bearing + candidate.north) * Math.PI) / 180;
  const result = estimateTime({
    ...candidate,
    points: [
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.1 },
      { x: 0.5 + (180 * Math.sin(angle)) / 1000, y: 0.5 - (180 * Math.cos(angle)) / 600 },
    ],
  });
  assert.ok(result);
  assert.ok(Math.abs(Date.parse(result.utc) - known.getTime()) <= 60_000);
  assert.ok(result.error < 0.01);
  assert.ok(result.matches > 1);
});
test('wraparound bearings have the correct distance', () => {
  assert.equal(angularDistance(359, 1), 2);
  assert.equal(normalize(-90), 270);
});
test('polar night returns no daylight match', () => {
  assert.equal(
    estimateTime({
      ...candidate,
      latitude: 89,
      date: '2026-12-21',
      points: [
        { x: 0.2, y: 0.5 },
        { x: 0.2, y: 0.1 },
        { x: 0.8, y: 0.5 },
      ],
    }),
    null,
  );
});
test('rejects invalid coordinates, dates, empty and coincident measurements', () => {
  const points = [
    { x: 0.2, y: 0.5 },
    { x: 0.2, y: 0.1 },
    { x: 0.8, y: 0.5 },
  ];
  for (const invalid of [
    { latitude: 91 },
    { longitude: NaN },
    { date: '2026-02-30' },
    { points: [] },
    { points: [points[0], points[1], points[0]] },
  ])
    assert.throws(() => estimateTime({ ...candidate, points, ...invalid }));
});
