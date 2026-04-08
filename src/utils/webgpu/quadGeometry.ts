import type { WorldBounds } from "./types";

export function createCenteredQuadVertices(halfWidth: number, halfHeight = halfWidth): Float32Array {
  return new Float32Array([
    -halfWidth, -halfHeight,
     halfWidth, -halfHeight,
    -halfWidth,  halfHeight,
    -halfWidth,  halfHeight,
     halfWidth, -halfHeight,
     halfWidth,  halfHeight,
  ]);
}

export function createUnitQuadVertices(): Float32Array {
  return new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
    -1,  1,
     1, -1,
     1,  1,
  ]);
}

export function createWorldQuadVertices(bounds: WorldBounds): Float32Array {
  return new Float32Array([
    bounds.minX, bounds.minY, 0, 1,
    bounds.maxX, bounds.minY, 1, 1,
    bounds.minX, bounds.maxY, 0, 0,
    bounds.minX, bounds.maxY, 0, 0,
    bounds.maxX, bounds.minY, 1, 1,
    bounds.maxX, bounds.maxY, 1, 0,
  ]);
}
