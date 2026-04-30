struct Uniforms {
    viewProj : mat4x4<f32>,
    timeSec : f32,
    _pad0 : vec3<f32>,
};

struct SmokeFieldParams {
    mapMin : vec2<f32>,
    mapMax : vec2<f32>,
    control : vec4<f32>,
    extra : vec4<f32>,
};

const MAX_SMOKE_INSTANCES : u32 = 32u;
const MAX_LOCAL_WALLS : u32 = 32u;

struct LocalWallBuffer {
    counts : array<vec4<f32>, 32>,
    segments : array<vec4<f32>, 1024>,
};

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(1) @binding(0) var smokeSampler : sampler;
@group(1) @binding(1) var smokeField : texture_2d<f32>;
@group(1) @binding(2) var<uniform> smokeParams : SmokeFieldParams;
@group(1) @binding(3) var obstacleField : texture_2d<f32>;
@group(2) @binding(0) var<storage, read> walls : LocalWallBuffer;

struct VSOut {
    @builtin(position) position : vec4<f32>,
    @location(0) localPos : vec2<f32>,
    @location(1) worldPos : vec2<f32>,
    @location(2) sourcePos : vec2<f32>,
    @location(3) sourceAlpha : f32,
    @location(4) sourceIndex : f32,
};

@vertex
fn vs_main(
    @location(0) localPos : vec2<f32>,
    @location(1) sourcePos : vec2<f32>,
    @location(2) sourceRadius : f32,
    @location(3) sourceAlpha : f32,
    @builtin(instance_index) instanceIndex : u32
) -> VSOut {
    var out : VSOut;

    let renderScale = 1.92;
    let shapedLocal = localPos * renderScale;
    let worldPos = sourcePos + shapedLocal * sourceRadius;
    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.localPos = shapedLocal;
    out.worldPos = worldPos;
    out.sourcePos = sourcePos;
    out.sourceAlpha = sourceAlpha;
    out.sourceIndex = f32(instanceIndex);
    return out;
}

fn cross2(a : vec2<f32>, b : vec2<f32>) -> f32 {
    return a.x * b.y - a.y * b.x;
}

fn segmentBlocks(origin : vec2<f32>, fragPos : vec2<f32>, wall : vec4<f32>) -> bool {
    let ray = fragPos - origin;
    if (dot(ray, ray) < 0.0001) {
        return false;
    }

    let wallVec = wall.zw - wall.xy;
    let denom = cross2(ray, wallVec);
    if (abs(denom) < 0.0001) {
        return false;
    }

    let offset = wall.xy - origin;
    let rayT = cross2(offset, wallVec) / denom;
    let wallT = cross2(offset, ray) / denom;
    return rayT >= 0.0 && rayT < 0.998 && wallT >= 0.0 && wallT <= 1.0;
}

fn hash21(p : vec2<f32>) -> f32 {
    let h = dot(p, vec2<f32>(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
}

fn noise21(p : vec2<f32>) -> f32 {
    let i = floor(p);
    let f = fract(p);
    let a = hash21(i);
    let b = hash21(i + vec2<f32>(1.0, 0.0));
    let c = hash21(i + vec2<f32>(0.0, 1.0));
    let d = hash21(i + vec2<f32>(1.0, 1.0));
    let u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

fn fbm(p : vec2<f32>) -> f32 {
    var value = 0.0;
    var amp = 0.5;
    var freq = 1.0;
    for (var i = 0; i < 4; i = i + 1) {
        value = value + noise21(p * freq) * amp;
        freq = freq * 2.02;
        amp = amp * 0.5;
    }
    return value;
}

fn moteLayer(p : vec2<f32>, scale : f32, seed : vec2<f32>, radius : f32) -> f32 {
    let gridPos = p * scale;
    let cell = floor(gridPos);
    var outValue = 0.0;
    for (var oy = -1; oy <= 1; oy = oy + 1) {
        for (var ox = -1; ox <= 1; ox = ox + 1) {
            let offset = vec2<f32>(f32(ox), f32(oy));
            let neighbor = cell + offset;
            let jitter = vec2<f32>(
                hash21(neighbor + seed),
                hash21(neighbor + seed + vec2<f32>(17.3, 9.1))
            );
            let center = neighbor + vec2<f32>(0.16, 0.16) + jitter * 0.68;
            let dist = length(gridPos - center);
            outValue = max(outValue, 1.0 - smoothstep(radius * 0.45, radius, dist));
        }
    }
    return outValue;
}

fn smokeSample(worldPos : vec2<f32>) -> vec2<f32> {
    let mapSize = max(smokeParams.mapMax - smokeParams.mapMin, vec2<f32>(1.0, 1.0));
    let uv = clamp(vec2<f32>(
        (worldPos.x - smokeParams.mapMin.x) / mapSize.x,
        (smokeParams.mapMax.y - worldPos.y) / mapSize.y
    ), vec2<f32>(0.0), vec2<f32>(1.0));
    let sample = textureSampleLevel(smokeField, smokeSampler, uv, 0.0);
    return vec2<f32>(clamp(sample.x, 0.0, 1.0), clamp(sample.y, 0.0, 1.0));
}

fn obstacleSample(worldPos : vec2<f32>) -> f32 {
    let mapSize = max(smokeParams.mapMax - smokeParams.mapMin, vec2<f32>(1.0, 1.0));
    let uv = clamp(vec2<f32>(
        (worldPos.x - smokeParams.mapMin.x) / mapSize.x,
        (smokeParams.mapMax.y - worldPos.y) / mapSize.y
    ), vec2<f32>(0.0), vec2<f32>(1.0));
    return textureSampleLevel(obstacleField, smokeSampler, uv, 0.0).x;
}

fn insideMapBounds(worldPos : vec2<f32>) -> bool {
    return worldPos.x >= smokeParams.mapMin.x
        && worldPos.x <= smokeParams.mapMax.x
        && worldPos.y >= smokeParams.mapMin.y
        && worldPos.y <= smokeParams.mapMax.y;
}

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
    let dist = length(input.localPos);
    if (dist > 1.52) {
        discard;
    }

    if (!insideMapBounds(input.worldPos)) {
        discard;
    }

    if (obstacleSample(input.worldPos) > 0.65) {
        discard;
    }

    let sourceIndex = min(u32(input.sourceIndex + 0.5), MAX_SMOKE_INSTANCES - 1u);
    let wallCount = min(u32(walls.counts[sourceIndex].x), MAX_LOCAL_WALLS);
    let wallBase = sourceIndex * MAX_LOCAL_WALLS;
    for (var i = 0u; i < wallCount; i = i + 1u) {
        if (segmentBlocks(input.sourcePos, input.worldPos, walls.segments[wallBase + i])) {
            discard;
        }
    }

    let fieldSample = smokeSample(input.worldPos);
    let density = fieldSample.x;
    let disturbance = fieldSample.y;
    if (density < 0.006) {
        discard;
    }

    let mapSize = max(smokeParams.mapMax - smokeParams.mapMin, vec2<f32>(1.0, 1.0));
    let worldUv = vec2<f32>(
        (input.worldPos.x - smokeParams.mapMin.x) / mapSize.x,
        (smokeParams.mapMax.y - input.worldPos.y) / mapSize.y
    );
    let drift = vec2<f32>(uniforms.timeSec * 0.009, -uniforms.timeSec * 0.0075);
    let coarse = fbm(worldUv * 7.2 + drift);
    let mid = fbm(worldUv.yx * 12.8 - drift * 1.18 + vec2<f32>(2.4, -1.1));
    let fine = fbm(worldUv * 24.0 + vec2<f32>(-3.2, 1.9) + drift * 0.2);
    let lowShape = fbm(worldUv * 4.8 + vec2<f32>(1.6, -2.3) + drift * 0.4);
    let curl = fbm(worldUv * 10.0 + vec2<f32>(-4.7, 3.1) + vec2<f32>(drift.y, -drift.x) * 1.4);
    let pocket = fbm(worldUv * 17.0 + vec2<f32>(5.2, -0.9) - drift * 0.7);
    let filament = fbm(worldUv * 31.0 + vec2<f32>(6.4, -4.2) + drift * 0.16);
    let textureMask = clamp(coarse * 0.24 + mid * 0.2 + fine * 0.12 + lowShape * 0.22 + curl * 0.22, 0.0, 1.0);

    let innerEnvelope = 1.0 - smoothstep(0.2, 1.02, dist);
    let edgeEnvelope = 1.0 - smoothstep(0.78, 1.48, dist);
    let shellEnvelope = smoothstep(0.32, 1.08, dist) * edgeEnvelope;
    let body = smoothstep(0.01, 0.68, density);
    let core = smoothstep(0.09, 0.9, density);
    let edge = smoothstep(0.01, 0.12, density) * (1.0 - smoothstep(0.12, 0.32, density));
    let shell = smoothstep(0.04, 0.3, density) * (1.0 - smoothstep(0.26, 0.82, density));
    let breakUp = clamp(textureMask * 0.82 + pocket * 0.36 - curl * 0.12, 0.0, 1.0);
    let erosion = smoothstep(0.22, 0.93, density * 0.84 + breakUp * 0.34 - pocket * 0.08);
    let ragged = shellEnvelope * smoothstep(0.44, 0.9, curl) * (0.18 + edge * 0.62);
    let tendrils = shellEnvelope
        * smoothstep(0.54, 0.95, textureMask)
        * smoothstep(0.16, 0.86, pocket)
        * smoothstep(0.58, 0.92, filament)
        * 0.54;
    let clumps = smoothstep(0.2, 0.78, lowShape) * shellEnvelope * 0.62;
    let voids = smoothstep(0.68, 0.94, pocket) * (1.0 - smoothstep(0.2, 0.56, density)) * 0.16;
    let internalShadow = smoothstep(0.16, 0.76, density) * (1.0 - textureMask * 0.3) * (0.74 + 0.26 * lowShape);
    let split = smoothstep(0.08, 0.34, disturbance);
    let ripHole = split
        * smoothstep(0.12, 0.82, density)
        * smoothstep(0.18, 0.72, 1.0 - breakUp)
        * 0.62;
    let ripEdge = split
        * shellEnvelope
        * smoothstep(0.38, 0.9, breakUp + filament * 0.18)
        * (0.24 + edgeEnvelope * 0.42);
    let carryWisps = split
        * smoothstep(0.92, 1.58, dist)
        * (1.0 - smoothstep(1.58, 2.18, dist))
        * smoothstep(0.46, 0.94, filament)
        * (0.48 + 0.52 * textureMask);
    let moteWarp = vec2<f32>(
        fbm(worldUv * 15.0 + vec2<f32>(3.2, -1.7) + drift * 0.34) - 0.5,
        fbm(worldUv.yx * 14.0 + vec2<f32>(-2.6, 4.1) - drift * 0.28) - 0.5
    );
    let moteUv = worldUv
        + moteWarp * (0.003 + disturbance * 0.016)
        + vec2<f32>(disturbance * 0.006, -disturbance * 0.004);
    let motesA = moteLayer(moteUv + drift * 0.04, 84.0, vec2<f32>(2.1, 7.4), 0.13);
    let motesB = moteLayer(moteUv.yx - drift * 0.03 + vec2<f32>(1.4, -2.8), 126.0, vec2<f32>(11.7, -4.3), 0.095);
    let moteField = max(motesA * 0.62, motesB * 0.48);
    let moteMask = moteField
        * shellEnvelope
        * smoothstep(0.12, 0.42, density)
        * smoothstep(0.08, 0.34, disturbance);
    let moteAlpha = moteMask * (0.006 + disturbance * 0.07 + tendrils * 0.02);

    var alpha = clamp(
        innerEnvelope * body * erosion * (0.68 + breakUp * 0.22)
        + core * 0.18
        + ragged * 0.24
        + tendrils * 0.3
        + clumps * 0.56
        + edge * 0.08
        - voids,
        0.0,
        0.985
    );
    alpha = alpha * (1.0 - ripHole);
    alpha = alpha * smoothstep(0.008, 0.06, density);
    alpha = max(alpha, shellEnvelope * 0.12 + ragged * 0.2);
    alpha = clamp(alpha + moteAlpha * 0.08 + ripEdge * 0.18 + carryWisps * 0.22, 0.0, 0.995);
    alpha = alpha * input.sourceAlpha;

    let soot = vec3<f32>(0.24, 0.25, 0.28);
    let base = vec3<f32>(0.36, 0.37, 0.41);
    let midColor = vec3<f32>(0.54, 0.56, 0.61);
    let highlight = vec3<f32>(0.74, 0.77, 0.83);
    let ripHighlight = vec3<f32>(0.86, 0.9, 0.96);
    let moteColor = vec3<f32>(0.72, 0.75, 0.81);
    var color = mix(soot, base, clamp(body * 0.62 + lowShape * 0.12, 0.0, 1.0));
    color = mix(color, midColor, clamp(textureMask * 0.26 + clumps * 0.34 + core * 0.22, 0.0, 0.9));
    color = mix(color, highlight, clamp(tendrils * 0.28 + ragged * 0.14 + core * 0.12, 0.0, 0.34));
    color = mix(color, soot * 0.86, internalShadow * 0.52 + voids * 0.34);
    color = mix(color, moteColor, clamp(moteAlpha * 0.9, 0.0, 0.06));
    color = mix(color, ripHighlight, clamp(ripEdge * 0.56 + carryWisps * 0.42 + split * 0.08, 0.0, 0.34));

    return vec4<f32>(color * alpha, alpha);
}
