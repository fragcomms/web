import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import type { Bounds, MapGeometry, Segment, Vec2 } from "../src/utils/types/mapGeometry";

const MAPS_DIR = path.resolve("public/maps");

type SvgNode = {
  [key: string]: unknown;
  ":@ "?: Record<string, string>;
};

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function num(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getAttrs(node: SvgNode): Record<string, string> {
  return (node[":@ "] as Record<string, string>) ?? {};
}

function pushSegment(out: Segment[], a: Vec2, b: Vec2, meta: Partial<Segment>) {
  if (a.x === b.x && a.y === b.y) return;
  out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...meta });
}

function polygonToSegments(points: Vec2[], closed: boolean, meta: Partial<Segment>): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    pushSegment(out, points[i], points[i + 1], meta);
  }
  if (closed && points.length > 2) {
    pushSegment(out, points[points.length - 1], points[0], meta);
  }
  return out;
}

function parsePointsString(pointsText: string): Vec2[] {
  const nums = pointsText.trim().replace(/,/g, " ").split(/\s+/).map(Number).filter((n) => Number.isFinite(n));
  const points: Vec2[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    points.push({ x: nums[i], y: nums[i + 1] });
  }
  return points;
}

function lineNodeToSegments(node: SvgNode, groupPath: string[]): Segment[] {
  const a = getAttrs(node);
  return [{
    x1: num(a.x1), y1: num(a.y1), x2: num(a.x2), y2: num(a.y2),
    stroke: a.stroke, fill: a.fill, group: [...groupPath], source: "line",
  }];
}

function rectNodeToSegments(node: SvgNode, groupPath: string[]): Segment[] {
  const a = getAttrs(node);
  const x = num(a.x); const y = num(a.y);
  const w = num(a.width); const h = num(a.height);
  const points: Vec2[] = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  return polygonToSegments(points, true, {
    stroke: a.stroke, fill: a.fill, group: [...groupPath], source: "rect",
  });
}

function polylineNodeToSegments(node: SvgNode, closed: boolean, groupPath: string[]): Segment[] {
  const a = getAttrs(node);
  const points = parsePointsString(a.points ?? "");
  return polygonToSegments(points, closed, {
    stroke: a.stroke, fill: a.fill, group: [...groupPath], source: closed ? "polygon" : "polyline",
  });
}

function isCommandToken(token: string): boolean {
  return /^[A-Za-z]$/.test(token);
}

function tokenizePath(d: string): string[] {
  return d.match(/[A-Za-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
}

function readNumber(tokens: string[], index: { i: number }): number {
  return Number(tokens[index.i++]);
}

function cubicBezierPoint(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const mt = 1 - t; const mt2 = mt * mt; const mt3 = mt2 * mt;
  const t2 = t * t; const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

function flattenCubicBezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, meta: Partial<Segment>, steps = 12): Segment[] {
  const out: Segment[] = [];
  let prev = p0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const next = cubicBezierPoint(p0, p1, p2, p3, t);
    pushSegment(out, prev, next, meta);
    prev = next;
  }
  return out;
}

function pathNodeToSegments(node: SvgNode, groupPath: string[]): Segment[] {
  const a = getAttrs(node);
  const tokens = tokenizePath(a.d ?? "");
  const meta: Partial<Segment> = { stroke: a.stroke, fill: a.fill, group: [...groupPath], source: "path" };
  const out: Segment[] = [];
  const idx = { i: 0 };
  let current: Vec2 = { x: 0, y: 0 };
  let subpathStart: Vec2 | null = null;
  let command = "";

  while (idx.i < tokens.length) {
    if (isCommandToken(tokens[idx.i])) command = tokens[idx.i++];
    switch (command) {
      case "M": case "m": {
        const firstX = readNumber(tokens, idx); const firstY = readNumber(tokens, idx);
        current = command === "m" ? { x: current.x + firstX, y: current.y + firstY } : { x: firstX, y: firstY };
        subpathStart = { ...current };
        while (idx.i < tokens.length && !isCommandToken(tokens[idx.i])) {
          const x = readNumber(tokens, idx); const y = readNumber(tokens, idx);
          const next = command === "m" ? { x: current.x + x, y: current.y + y } : { x, y };
          pushSegment(out, current, next, meta);
          current = next;
        }
        break;
      }
      case "L": case "l": {
        while (idx.i < tokens.length && !isCommandToken(tokens[idx.i])) {
          const x = readNumber(tokens, idx); const y = readNumber(tokens, idx);
          const next = command === "l" ? { x: current.x + x, y: current.y + y } : { x, y };
          pushSegment(out, current, next, meta);
          current = next;
        }
        break;
      }
      case "H": case "h": {
        while (idx.i < tokens.length && !isCommandToken(tokens[idx.i])) {
          const x = readNumber(tokens, idx);
          const next = command === "h" ? { x: current.x + x, y: current.y } : { x, y: current.y };
          pushSegment(out, current, next, meta);
          current = next;
        }
        break;
      }
      case "V": case "v": {
        while (idx.i < tokens.length && !isCommandToken(tokens[idx.i])) {
          const y = readNumber(tokens, idx);
          const next = command === "v" ? { x: current.x, y: current.y + y } : { x: current.x, y };
          pushSegment(out, current, next, meta);
          current = next;
        }
        break;
      }
      case "Z": case "z": {
        if (subpathStart) {
          pushSegment(out, current, subpathStart, meta);
          current = { ...subpathStart };
        }
        break;
      }
      case "C": case "c": {
        while (idx.i < tokens.length && !isCommandToken(tokens[idx.i])) {
          const x1 = readNumber(tokens, idx); const y1 = readNumber(tokens, idx);
          const x2 = readNumber(tokens, idx); const y2 = readNumber(tokens, idx);
          const x = readNumber(tokens, idx); const y = readNumber(tokens, idx);
          const p0 = current;
          const p1 = command === "c" ? { x: current.x + x1, y: current.y + y1 } : { x: x1, y: y1 };
          const p2 = command === "c" ? { x: current.x + x2, y: current.y + y2 } : { x: x2, y: y2 };
          const p3 = command === "c" ? { x: current.x + x, y: current.y + y } : { x, y };
          out.push(...flattenCubicBezier(p0, p1, p2, p3, meta, 12));
          current = p3;
        }
        break;
      }
      default: throw new Error(`Unsupported SVG path command: ${command}`);
    }
  }
  return out;
}

function flipY(segments: Segment[]): Segment[] {
  return segments.map((s) => ({ ...s, y1: -s.y1, y2: -s.y2 }));
}

function computeBounds(segments: Segment[]): Bounds {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const s of segments) {
    if (s.x1 < minX) minX = s.x1; if (s.x2 < minX) minX = s.x2;
    if (s.y1 < minY) minY = s.y1; if (s.y2 < minY) minY = s.y2;
    if (s.x1 > maxX) maxX = s.x1; if (s.x2 > maxX) maxX = s.x2;
    if (s.y1 > maxY) maxY = s.y1; if (s.y2 > maxY) maxY = s.y2;
  }
  return { minX, minY, maxX, maxY };
}

function dedupeSegments(segments: Segment[]): Segment[] {
  const seen = new Set<string>();
  const out: Segment[] = [];
  for (const s of segments) {
    const forward = `${s.x1},${s.y1},${s.x2},${s.y2}`;
    const reverse = `${s.x2},${s.y2},${s.x1},${s.y1}`;
    const key = forward < reverse ? forward : reverse;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function extractAllShapes(node: unknown, outShapes: Segment[][], groupPath: string[] = []) {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const attrs = obj[":@ "] as Record<string, string> | undefined;
  
  const id = attrs?.id ? [attrs.id] : [];
  const inkscapeLabel = attrs?.["inkscape:label"] ? [attrs["inkscape:label"]] : [];
  
  const currentPath = [...groupPath, ...id, ...inkscapeLabel];

  if (obj.path) for (const child of toArray(obj.path as SvgNode | SvgNode[])) {
    const segments = pathNodeToSegments(child, currentPath);
    if (segments.length > 0) outShapes.push(segments);
  }
  if (obj.rect) for (const child of toArray(obj.rect as SvgNode | SvgNode[])) {
    const segments = rectNodeToSegments(child, currentPath);
    if (segments.length > 0) outShapes.push(segments);
  }
  if (obj.polygon) for (const child of toArray(obj.polygon as SvgNode | SvgNode[])) {
    const segments = polylineNodeToSegments(child, true, currentPath);
    if (segments.length > 0) outShapes.push(segments);
  }
  if (obj.polyline) for (const child of toArray(obj.polyline as SvgNode | SvgNode[])) {
    const segments = polylineNodeToSegments(child, false, currentPath);
    if (segments.length > 0) outShapes.push(segments);
  }
  if (obj.line) for (const child of toArray(obj.line as SvgNode | SvgNode[])) {
    const segments = lineNodeToSegments(child, currentPath);
    if (segments.length > 0) outShapes.push(segments);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (["path", "rect", "polygon", "polyline", "line", ":@ "].includes(key)) continue;
    for (const child of toArray(value)) {
      extractAllShapes(child, outShapes, currentPath);
    }
  }
}

function processSvgFile(inputPath: string, mapName: string) {
  try {
    const svgText = fs.readFileSync(inputPath, "utf8");

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      attributesGroupName: ":@ ",
    });

    const parsed = parser.parse(svgText) as Record<string, unknown>;
    const svgRoot = parsed.svg;

    if (!svgRoot) {
      console.warn(`[!] Skipping ${mapName}: No <svg> root found.`);
      return;
    }

    const allShapes: Segment[][] = [];
    extractAllShapes(svgRoot, allShapes);

    const outlineSegments = allShapes.flat().filter(s => s.group.includes("map-outline"));

    if (outlineSegments.length === 0) {
      console.warn(`[!] Skipping ${mapName}: Could not find any shapes inside a group named 'map-outline'.`);
      return;
    }

    const segments = dedupeSegments(flipY(outlineSegments));
    const bounds = computeBounds(segments);

    const geometry: MapGeometry = {
      segments,
      bounds,
    };

    const jsonOutputPath = path.join(MAPS_DIR, `${mapName}.geometry.json`);
    fs.writeFileSync(jsonOutputPath, JSON.stringify(geometry, null, 2));

    console.log(`[✓] Extracted ${mapName} -> ${segments.length} boundary segments saved to ${mapName}.geometry.json`);
  } catch (err) {
    console.error(`[X] Error processing ${mapName}:`, err);
  }
}

function main() {
  if (!fs.existsSync(MAPS_DIR)) {
    console.error(`Directory not found: ${MAPS_DIR}`);
    return;
  }

  const files = fs.readdirSync(MAPS_DIR);
  let processedCount = 0;

  console.log(`Scanning ${MAPS_DIR} for SVGs...`);

  for (const file of files) {
    if (file.endsWith(".svg")) {
      const inputPath = path.join(MAPS_DIR, file);
      
      const mapName = file.replace(/\.radar\.svg$/, "").replace(/\.svg$/, "");
      
      processSvgFile(inputPath, mapName);
      processedCount++;
    }
  }

  console.log(`\nFinished checking ${processedCount} SVG files.`);
}

main();