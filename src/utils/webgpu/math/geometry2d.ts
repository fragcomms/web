import type { WallSegment } from "../renderers/mapRenderer";

export type Vec2 = {
  x: number;
  y: number;
};

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function lengthVec2(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function normalizeVec2(v: Vec2): Vec2 {
  const len = lengthVec2(v);
  if (len < 1e-6) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

export function intersectRaySegment(
  rayOrigin: Vec2,
  rayDir: Vec2,
  maxDistance: number,
  seg: WallSegment,
): number | null {
  const p = rayOrigin;
  const r = rayDir;
  const q = { x: seg.x1, y: seg.y1 };
  const s = { x: seg.x2 - seg.x1, y: seg.y2 - seg.y1 };

  const rxs = cross(r, s);
  if (Math.abs(rxs) < 1e-8) {
    return null;
  }

  const qp = { x: q.x - p.x, y: q.y - p.y };
  const t = cross(qp, s) / rxs;
  const u = cross(qp, r) / rxs;

  if (t >= 0 && t <= maxDistance && u >= 0 && u <= 1) {
    return t;
  }

  return null;
}

export function intersectSegmentWithWall(
  start: Vec2,
  end: Vec2,
  wall: WallSegment,
): { t: number; x: number; y: number; } | null {
  const p = start;
  const r = { x: end.x - start.x, y: end.y - start.y };
  const q = { x: wall.x1, y: wall.y1 };
  const s = { x: wall.x2 - wall.x1, y: wall.y2 - wall.y1 };

  const rxs = cross(r, s);
  if (Math.abs(rxs) < 1e-8) {
    return null;
  }

  const qp = { x: q.x - p.x, y: q.y - p.y };
  const t = cross(qp, s) / rxs;
  const u = cross(qp, r) / rxs;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      t,
      x: p.x + r.x * t,
      y: p.y + r.y * t,
    };
  }

  return null;
}
