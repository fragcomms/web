import { writeFloat32Slice } from "../core/gpuBufferUtils";
import { getTeamColor } from "../core/renderPalette";
import { intersectSegmentWithWall, normalizeVec2, type Vec2 } from "../math/geometry2d";
import type { RenderPlayer, RenderTracer } from "../types";
import type { WallSegment } from "./mapRenderer";

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
  bouncesRemaining: number;
};

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
        bouncesRemaining: 0,
      });
    }
  }

  setWalls(walls: WallSegment[]) {
    this.walls = walls;
  }

  syncDeaths(players: RenderPlayer[], tracers: RenderTracer[], isSecondHalf: boolean) {
    for (const player of players) {
      const wasAlive = this.prevAliveBySteamId.get(player.steamid) ?? player.alive;
      if (wasAlive && !player.alive) {
        this.spawnBurst(player, tracers, isSecondHalf);
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

      let nearestHit: { t: number; x: number; y: number; wall: WallSegment; } | null = null;
      for (const wall of this.walls) {
        const hit = intersectSegmentWithWall(
          { x: shard.x, y: shard.y },
          { x: nextX, y: nextY },
          wall,
        );
        if (!hit) continue;
        if (!nearestHit || hit.t < nearestHit.t) {
          nearestHit = { ...hit, wall };
        }
      }

      if (nearestHit) {
        const collision = this.getCollisionBasis(nearestHit.wall, { x: shard.vx, y: shard.vy });
        this.spawnWallSplatter(nearestHit.x, nearestHit.y, shard, collision.tangent, collision.normal);

        if (shard.bouncesRemaining > 0) {
          const bounceVelocity = this.computeBounceVelocity(
            { x: shard.vx, y: shard.vy },
            collision.tangent,
            collision.normal,
          );
          const bounceSpeedSq = bounceVelocity.x * bounceVelocity.x + bounceVelocity.y * bounceVelocity.y;

          if (bounceSpeedSq > 80 * 80) {
            shard.x = nearestHit.x + collision.normal.x * 3;
            shard.y = nearestHit.y + collision.normal.y * 3;
            shard.vx = bounceVelocity.x;
            shard.vy = bounceVelocity.y;
            shard.size *= 0.82;
            shard.life *= 0.72;
            shard.bouncesRemaining = 0;
          } else {
            shard.x = nearestHit.x;
            shard.y = nearestHit.y;
            shard.vx = 0;
            shard.vy = 0;
            shard.bouncesRemaining = 0;
          }
        } else {
          shard.x = nearestHit.x;
          shard.y = nearestHit.y;
          shard.vx = 0;
          shard.vy = 0;
        }
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

    writeFloat32Slice(this.queue, this.instanceBuffer, data, count * this.instanceStrideFloats);

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

  private spawnBurst(player: RenderPlayer, tracers: RenderTracer[], isSecondHalf: boolean) {
    const [baseR, baseG, baseB] = getTeamColor(player.team, isSecondHalf);
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
      shard.bouncesRemaining = 1;
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

      const shotDir = normalizeVec2({
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

  private allocateShard(excluded?: Shard): Shard {
    for (const shard of this.shards) {
      if (shard !== excluded && !shard.active) {
        return shard;
      }
    }

    let oldest: Shard | null = null;
    for (const shard of this.shards) {
      if (shard === excluded) {
        continue;
      }
      if (!oldest || shard.life < oldest.life) {
        oldest = shard;
      }
    }
    return oldest ?? excluded ?? this.shards[0];
  }

  private getCollisionBasis(wall: WallSegment, velocity: Vec2) {
    const tangent = normalizeVec2({
      x: wall.x2 - wall.x1,
      y: wall.y2 - wall.y1,
    });

    let normal = {
      x: -tangent.y,
      y: tangent.x,
    };

    if (this.dot(velocity, normal) > 0) {
      normal = {
        x: -normal.x,
        y: -normal.y,
      };
    }

    return { tangent, normal };
  }

  private computeBounceVelocity(velocity: Vec2, tangent: Vec2, normal: Vec2): Vec2 {
    const tangentSpeed = this.dot(velocity, tangent);
    const normalSpeed = this.dot(velocity, normal);

    return {
      x: tangent.x * tangentSpeed * 0.58 + normal.x * (-normalSpeed) * 0.22,
      y: tangent.y * tangentSpeed * 0.58 + normal.y * (-normalSpeed) * 0.22,
    };
  }

  private spawnWallSplatter(hitX: number, hitY: number, source: Shard, tangent: Vec2, normal: Vec2) {
    const sourceSpeed = Math.hypot(source.vx, source.vy);
    if (sourceSpeed < 220) {
      return;
    }

    const splatterCount = Math.min(6, 3 + Math.floor(sourceSpeed / 900));
    for (let i = 0; i < splatterCount; i++) {
      const shard = this.allocateShard(source);
      const tangentDir = Math.random() < 0.5 ? -1 : 1;
      const tangentSpeed = (0.12 + Math.random() * 0.2) * sourceSpeed * tangentDir;
      const outwardSpeed = (0.02 + Math.random() * 0.05) * sourceSpeed;
      const life = 0.35 + Math.random() * 0.35;

      shard.x = hitX + normal.x * (1.5 + Math.random() * 1.5) + tangent.x * ((Math.random() - 0.5) * 8);
      shard.y = hitY + normal.y * (1.5 + Math.random() * 1.5) + tangent.y * ((Math.random() - 0.5) * 8);
      shard.vx = tangent.x * tangentSpeed + normal.x * outwardSpeed;
      shard.vy = tangent.y * tangentSpeed + normal.y * outwardSpeed;
      shard.size = Math.max(2, source.size * (0.32 + Math.random() * 0.26));
      shard.life = life;
      shard.maxLife = life;
      shard.r = Math.min(1, source.r + Math.random() * 0.08);
      shard.g = Math.min(1, source.g + Math.random() * 0.08);
      shard.b = Math.min(1, source.b + Math.random() * 0.08);
      shard.active = true;
      shard.bouncesRemaining = 0;
    }
  }

  private dot(a: Vec2, b: Vec2): number {
    return a.x * b.x + a.y * b.y;
  }
}
