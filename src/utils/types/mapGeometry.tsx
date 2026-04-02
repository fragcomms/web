export type Vec2 = {
  x: number;
  y: number;
};

export type Segment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type MapGeometry = {
  segments: Segment[];
  bounds: Bounds;
};