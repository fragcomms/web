import type { WallSegment } from "./mapRenderer";

export type LocalWallSource = {
  x: number;
  y: number;
  radius: number;
  enabled: boolean;
};

export const LOCAL_WALL_FLOATS_PER_INSTANCE = 4;

export function fillLocalWallScratch(
  scratch: Float32Array,
  distanceScratch: Float32Array,
  sources: LocalWallSource[],
  sourceCount: number,
  walls: WallSegment[],
  maxInstances: number,
  maxWallsPerInstance: number,
) {
  scratch.fill(0);

  const count = Math.min(sourceCount, maxInstances);
  const segmentBase = maxInstances * LOCAL_WALL_FLOATS_PER_INSTANCE;

  for (let sourceIndex = 0; sourceIndex < count; sourceIndex++) {
    const source = sources[sourceIndex];
    if (!source.enabled || source.radius <= 0) {
      continue;
    }

    const cutoff = source.radius * 2.08;
    const cutoffSq = cutoff * cutoff;
    let localCount = 0;
    let farthestLocal = 0;
    let farthestDistSq = -1;

    for (const wall of walls) {
      const distSq = distanceSqToSegment(source.x, source.y, wall);
      if (distSq > cutoffSq) {
        continue;
      }

      if (localCount < maxWallsPerInstance) {
        writeWall(scratch, maxInstances, maxWallsPerInstance, sourceIndex, localCount, wall);
        distanceScratch[sourceIndex * maxWallsPerInstance + localCount] = distSq;

        if (distSq > farthestDistSq) {
          farthestDistSq = distSq;
          farthestLocal = localCount;
        }

        localCount++;
        continue;
      }

      if (distSq >= farthestDistSq) {
        continue;
      }

      writeWall(scratch, maxInstances, maxWallsPerInstance, sourceIndex, farthestLocal, wall);
      distanceScratch[sourceIndex * maxWallsPerInstance + farthestLocal] = distSq;

      farthestDistSq = -1;
      for (let i = 0; i < maxWallsPerInstance; i++) {
        const candidateDistSq = distanceScratch[sourceIndex * maxWallsPerInstance + i];
        if (candidateDistSq > farthestDistSq) {
          farthestDistSq = candidateDistSq;
          farthestLocal = i;
        }
      }
    }

    scratch[sourceIndex * LOCAL_WALL_FLOATS_PER_INSTANCE] = localCount;
  }

  return segmentBase + count * maxWallsPerInstance * 4;
}

function writeWall(
  scratch: Float32Array,
  maxInstances: number,
  maxWallsPerInstance: number,
  sourceIndex: number,
  localIndex: number,
  wall: WallSegment,
) {
  const segmentBase = maxInstances * LOCAL_WALL_FLOATS_PER_INSTANCE;
  const base = segmentBase + (sourceIndex * maxWallsPerInstance + localIndex) * 4;
  scratch[base + 0] = wall.x1;
  scratch[base + 1] = wall.y1;
  scratch[base + 2] = wall.x2;
  scratch[base + 3] = wall.y2;
}

function distanceSqToSegment(x: number, y: number, wall: WallSegment) {
  const abX = wall.x2 - wall.x1;
  const abY = wall.y2 - wall.y1;
  const denom = abX * abX + abY * abY;
  const t = denom > 0 ? Math.max(0, Math.min(1, ((x - wall.x1) * abX + (y - wall.y1) * abY) / denom)) : 0;
  const closestX = wall.x1 + abX * t;
  const closestY = wall.y1 + abY * t;
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy;
}
