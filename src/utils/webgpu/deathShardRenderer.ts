import type { WallSegment } from "./mapRenderer";
import type { RenderPlayer, RenderTracer } from "./types";

type Vec2 = {
  x: number;
  y: number;
};

type Shard = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  active: boolean;
};

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len < 1e-6) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

function intersectSegmentWithWall(
  start: Vec2,
  end: Vec2,
  wall: WallSegment,
): { t: number; x: number; y: number } | null {
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

export class DeathShardRenderer {
  private queue: GPUQueue;
  private pipeline: GPURenderPipeline;
  private globalBindGroup: GPUBindGroup;
  private quadVertexBuffer: GPUBuffer;
  private instanceBuffer: GPUBuffer;

  private maxShards: number;
  private instanceStrideFloats = 7;
  private instanceScratch: Float32Array;

  private walls: WallSegment[] = [];
  private shards: Shard[] = [];
  private prevAliveBySteamId = new Map<string, boolean>();

  constructor(
    queue: GPUQueue,
    pipeline: GPURenderPipeline,
    globalBindGroup: GPUBindGroup,
    quadVertexBuffer: GPUBuffer,
    instanceBuffer: GPUBuffer,
    maxShards: number,
  ) {
    this.queue = queue;
    this.pipeline = pipeline;
    this.globalBindGroup = globalBindGroup;
    this.quadVertexBuffer = quadVertexBuffer;
    this.instanceBuffer = instanceBuffer;
    this.maxShards = maxShards;
    this.instanceScratch = new Float32Array(this.maxShards * this.instanceStrideFloats);

    for (let i = 0; i < this.maxShards; i++) {
      this.shards.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 0,
        life: 0,
        maxLife: 1,
        r: 1,
        g: 1,
        b: 1,
        active: false,
      });
    }
  }

  setWalls(walls: WallSegment[]) {
    this.walls = walls;
  }

  syncDeaths(players: RenderPlayer[], tracers: RenderTracer[]) {
    for (const player of players) {
      const wasAlive = this.prevAliveBySteamId.get(player.steamid) ?? player.alive;
      if (wasAlive && !player.alive) {
        this.spawnBurst(player, tracers);
      }
      this.prevAliveBySteamId.set(player.steamid, player.alive);
    }
  }

  update(dtSec: number) {
    const dt = Math.min(Math.max(dtSec, 0), 1 / 20);
    if (dt <= 0) return;

    const drag = Math.exp(-5 * dt);

    for (const shard of this.shards) {
      if (!shard.active) continue;

      shard.life -= dt;
      if (shard.life <= 0) {
        shard.active = false;
        continue;
      }

      const nextX = shard.x + shard.vx * dt;
      const nextY = shard.y + shard.vy * dt;

      let nearestHit: { t: number; x: number; y: number } | null = null;
      for (const wall of this.walls) {
        const hit = intersectSegmentWithWall(
          { x: shard.x, y: shard.y },
          { x: nextX, y: nextY },
          wall,
        );
        if (!hit) continue;
        if (!nearestHit || hit.t < nearestHit.t) {
          nearestHit = hit;
        }
      }

      if (nearestHit) {
        shard.x = nearestHit.x;
        shard.y = nearestHit.y;
        shard.vx = 0;
        shard.vy = 0;
      } else {
        shard.x = nextX;
        shard.y = nextY;
      }

      shard.vx *= drag;
      shard.vy *= drag;
    }
  }

  upload(): number {
    let count = 0;
    const data = this.instanceScratch;

    for (const shard of this.shards) {
      if (!shard.active) continue;
      if (count >= this.maxShards) break;

      const alpha = Math.max(0, shard.life / shard.maxLife);
      const base = count * this.instanceStrideFloats;
      data[base + 0] = shard.x;
      data[base + 1] = shard.y;
      data[base + 2] = shard.size;
      data[base + 3] = shard.r;
      data[base + 4] = shard.g;
      data[base + 5] = shard.b;
      data[base + 6] = alpha;
      count++;
    }

    this.queue.writeBuffer(
      this.instanceBuffer,
      0,
      data.buffer,
      data.byteOffset,
      count * this.instanceStrideFloats * 4,
    );

    return count;
  }

  draw(pass: GPURenderPassEncoder, instanceCount: number) {
    if (instanceCount <= 0) return;

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.globalBindGroup);
    pass.setVertexBuffer(0, this.quadVertexBuffer);
    pass.setVertexBuffer(1, this.instanceBuffer);
    pass.draw(6, instanceCount, 0, 0);
  }

  private spawnBurst(player: RenderPlayer, tracers: RenderTracer[]) {
    const isCT = player.team === 3;
    const baseR = isCT ? 0.2 : 1.0;
    const baseG = isCT ? 0.6 : 0.4;
    const baseB = isCT ? 1.0 : 0.2;
    const impactDir = this.findImpactDirection(player, tracers);
    const baseAngle = Math.atan2(impactDir.y, impactDir.x);

    const shardCount = 20;
    for (let i = 0; i < shardCount; i++) {
      const shard = this.allocateShard();
      const spread = (Math.random() - 0.5) * 1.1;
      const sideKick = (Math.random() - 0.5) * 90;
      const angle = baseAngle + spread;
      const speed = 2000 + Math.random() * 460;
      const life = 3 + Math.random() * 0.35;

      shard.x = player.x;
      shard.y = player.y;
      shard.vx = Math.cos(angle) * speed + Math.cos(baseAngle + Math.PI * 0.5) * sideKick;
      shard.vy = Math.sin(angle) * speed + Math.sin(baseAngle + Math.PI * 0.5) * sideKick;
      shard.size = 5 + Math.random() * 8;
      shard.life = life;
      shard.maxLife = life;
      shard.r = Math.min(1, baseR + Math.random() * 0.25);
      shard.g = Math.min(1, baseG + Math.random() * 0.25);
      shard.b = Math.min(1, baseB + Math.random() * 0.25);
      shard.active = true;
    }
  }

  private findImpactDirection(player: RenderPlayer, tracers: RenderTracer[]): Vec2 {
    let bestDir: Vec2 | null = null;
    let bestDistSq = 140 * 140;

    for (const tracer of tracers) {
      const dxToEnd = player.x - tracer.x1;
      const dyToEnd = player.y - tracer.y1;
      const endDistSq = dxToEnd * dxToEnd + dyToEnd * dyToEnd;
      if (endDistSq > bestDistSq) {
        continue;
      }

      const shotDir = normalize({
        x: tracer.x1 - tracer.x0,
        y: tracer.y1 - tracer.y0,
      });
      if (shotDir.x === 0 && shotDir.y === 0) {
        continue;
      }

      bestDistSq = endDistSq;
      bestDir = {
        x: -shotDir.x,
        y: -shotDir.y,
      };
    }

    if (bestDir) {
      return bestDir;
    }

    const fallbackAngle = (player.rot + 180) * (Math.PI / 180);
    return {
      x: Math.cos(fallbackAngle),
      y: Math.sin(fallbackAngle),
    };
  }

  private allocateShard(): Shard {
    for (const shard of this.shards) {
      if (!shard.active) {
        return shard;
      }
    }

    let oldest = this.shards[0];
    for (const shard of this.shards) {
      if (shard.life < oldest.life) {
        oldest = shard;
      }
    }
    return oldest;
  }
}
