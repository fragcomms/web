struct Uniforms {
    viewProj : mat4x4<f32>,
    timeSec : f32,
    _pad0 : vec3<f32>,
};

const MAX_AREA_EFFECT_INSTANCES : u32 = 64u;
const MAX_LOCAL_WALLS : u32 = 64u;

struct LocalWallBuffer {
    counts : array<vec4<f32>, 64>,
    segments : array<vec4<f32>, 4096>,
};

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

struct SmokeFieldParams {
    mapMin : vec2<f32>,
    mapMax : vec2<f32>,
};

@group(1) @binding(0) var<storage, read> walls : LocalWallBuffer;
@group(2) @binding(0) var smokeSampler : sampler;
@group(2) @binding(1) var smokeField : texture_2d<f32>;
@group(2) @binding(2) var<uniform> smokeParams : SmokeFieldParams;
@group(2) @binding(3) var obstacleField : texture_2d<f32>;

struct VSOut {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec3<f32>,
    @location(1) localPos : vec2<f32>,
    @location(2) alpha : f32,
    @location(3) softness : f32,
    @location(4) density : f32,
    @location(5) effectType : f32,
    @location(6) worldPos : vec2<f32>,
    @location(7) origin : vec2<f32>,
    @location(8) @interpolate(flat, either) sourceIndex : u32,
};

@vertex
fn vs_main(
    @location(0) a_pos      : vec2<f32>,
    @location(1) i_position : vec2<f32>,
    @location(2) i_radius   : f32,
    @location(3) i_color    : vec3<f32>,
    @location(4) i_alpha    : f32,
    @location(5) i_softness : f32,
    @location(6) i_density  : f32,
    @location(7) i_effectType : f32,
    @builtin(instance_index) instanceIndex : u32,
) -> VSOut {
    var out : VSOut;

    let scaled = a_pos * i_radius;
    let worldPos = scaled + i_position;
    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.color = i_color;
    out.localPos = a_pos;
    out.alpha = i_alpha;
    out.softness = i_softness;
    out.density = i_density;
    out.effectType = i_effectType;
    out.worldPos = worldPos;
    out.origin = i_position;
    out.sourceIndex = instanceIndex;

    return out;
}

fn cross2(a : vec2<f32>, b : vec2<f32>) -> f32 {
    return a.x * b.y - a.y * b.x;
}

fn segmentBlocks(origin : vec2<f32>, fragPos : vec2<f32>, wall : vec4<f32>) -> bool {
    let p = origin;
    let r = fragPos - origin;
    let q = wall.xy;
    let s = wall.zw - wall.xy;
    let rxs = cross2(r, s);

    if (abs(rxs) < 0.0001) {
        return false;
    }

    let qp = q - p;
    let t = cross2(qp, s) / rxs;
    let u = cross2(qp, r) / rxs;

    return t >= 0.0 && t < 0.999 && u >= 0.0 && u <= 1.0;
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
        value = value + amp * noise21(p * freq);
        freq = freq * 2.03;
        amp = amp * 0.5;
    }

    return value;
}

fn ringProfile(dist : f32, radius : f32, width : f32) -> f32 {
    let safeWidth = max(width, 0.001);
    let d = (dist - radius) / safeWidth;
    return exp(-d * d);
}

fn ridgeFbm(p : vec2<f32>) -> f32 {
    var value = 0.0;
    var amp = 0.5;
    var freq = 1.0;

    for (var i = 0; i < 4; i = i + 1) {
        let n = noise21(p * freq);
        value = value + (1.0 - abs(n * 2.0 - 1.0)) * amp;
        freq = freq * 2.14;
        amp = amp * 0.55;
    }

    return value;
}

fn sampleSmokeField(worldPos : vec2<f32>) -> vec3<f32> {
    let size = max(smokeParams.mapMax - smokeParams.mapMin, vec2<f32>(1.0, 1.0));
    let uv = clamp(vec2<f32>(
        (worldPos.x - smokeParams.mapMin.x) / size.x,
        (smokeParams.mapMax.y - worldPos.y) / size.y
    ), vec2<f32>(0.0), vec2<f32>(1.0));
    let sample = textureSampleLevel(smokeField, smokeSampler, uv, 0.0);
    return vec3<f32>(0.0, 0.0, sample.x);
}

fn sampleObstacleField(worldPos : vec2<f32>) -> f32 {
    let size = max(smokeParams.mapMax - smokeParams.mapMin, vec2<f32>(1.0, 1.0));
    let uv = clamp(vec2<f32>(
        (worldPos.x - smokeParams.mapMin.x) / size.x,
        (smokeParams.mapMax.y - worldPos.y) / size.y
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
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
    let dist = length(input.localPos);
    let w = fwidth(dist);
    let field = sampleSmokeField(input.worldPos);

    if (input.effectType > 1.5) {
        let progress = clamp(input.softness, 0.0, 1.0);
        let life = clamp(input.density, 0.0, 1.0);
        let shockRadius = 0.16 + progress * 0.78;
        let ringWidth = 0.05 + progress * 0.05;
        let shockRing = ringProfile(dist, shockRadius, ringWidth) * (0.7 + life * 0.6);
        let rippleRing = ringProfile(dist, shockRadius + 0.12, ringWidth * 1.6)
            * (1.0 - progress)
            * 0.46;
        let core = (1.0 - smoothstep(0.0, 0.24 + progress * 0.1, dist)) * life;
        let secondaryRing = ringProfile(dist, shockRadius + 0.18, ringWidth * 0.92)
            * (1.0 - smoothstep(0.0, 0.44, progress))
            * 0.72;
        let dustBloom = (1.0 - smoothstep(0.04, 1.04, dist))
            * (1.0 - smoothstep(0.08, 0.82, progress))
            * (0.54 + life * 1.08);
        let haze = (1.0 - smoothstep(0.08, 1.0, dist))
            * (1.0 - smoothstep(0.18, 0.96, progress))
            * 0.38;
        let shimmer = fbm(
            input.localPos * (9.0 + progress * 5.0)
            + vec2<f32>(uniforms.timeSec * 3.8, -uniforms.timeSec * 2.4)
        );
        let tailFade = 1.0 - smoothstep(0.72, 1.0, progress);
        let alpha = clamp(
            core * 1.24
            + shockRing * 1.34
            + rippleRing * 1.12
            + secondaryRing * 1.08
            + dustBloom * 0.72
            + haze * 0.18,
            0.0,
            1.85
        ) * input.alpha * tailFade * (0.9 + shimmer * 0.14);
        let hotCore = vec3<f32>(1.0, 0.96, 0.84);
        let gold = vec3<f32>(1.0, 0.8, 0.46);
        let ember = vec3<f32>(1.0, 0.48, 0.16);
        var finalColor = mix(ember, gold, clamp(shockRing + secondaryRing * 0.42 + haze * 0.22, 0.0, 1.0));
        finalColor = mix(finalColor, hotCore, clamp(core + rippleRing * 0.28, 0.0, 1.0));
        finalColor = mix(finalColor, vec3<f32>(0.78, 0.72, 0.64), clamp(dustBloom * 0.5, 0.0, 0.42));
        finalColor = mix(finalColor, input.color, 0.28);
        return vec4<f32>(finalColor * alpha, alpha);
    }

    if (!insideMapBounds(input.worldPos)) {
        discard;
    }

    if (sampleObstacleField(input.worldPos) > 0.65) {
        discard;
    }

    let sourceIndex = min(input.sourceIndex, MAX_AREA_EFFECT_INSTANCES - 1u);
    let wallCount = min(u32(walls.counts[sourceIndex].x), MAX_LOCAL_WALLS);
    let wallBase = sourceIndex * MAX_LOCAL_WALLS;
    for (var i = 0u; i < wallCount; i = i + 1u) {
        if (segmentBlocks(input.origin, input.worldPos, walls.segments[wallBase + i])) {
            discard;
        }
    }

    if (input.effectType < 0.5) {
        let displacedLocal = input.localPos + field.xy;
        let displacedDist = length(displacedLocal);
        let plume = 1.0 - smoothstep(0.24 - w, 1.02 + w, displacedDist);
        let shell = 1.0 - smoothstep(0.72 - w, 1.22 + w, displacedDist);
        let drift = vec2<f32>(uniforms.timeSec * 0.045, -uniforms.timeSec * 0.03);
        let uv = displacedLocal * (2.8 + input.density * 2.4);
        let n1 = fbm(uv + drift);
        let n2 = fbm(uv.yx * 1.35 + vec2<f32>(4.2, -2.1) - drift * 1.4);
        let curl = sin(uv.x * 1.5 + uniforms.timeSec * 0.8) * cos(uv.y * 1.2 - uniforms.timeSec * 0.55);
        let erosion = smoothstep(0.18, 0.92, 0.45 * n1 + 0.35 * n2 + 0.2 * (curl * 0.5 + 0.5));
        let wakeCut = 1.0 - field.z * 1.15 * smoothstep(0.06, 0.92, displacedDist);
        let flowDir = normalize(field.xy + vec2<f32>(0.0001, 0.0));
        let tailAxis = dot(displacedLocal, flowDir);
        let tailCross = abs(dot(displacedLocal, vec2<f32>(-flowDir.y, flowDir.x)));
        let tail = field.z
            * smoothstep(-0.18, 0.18, tailAxis)
            * (1.0 - smoothstep(0.18, 1.75, tailAxis))
            * (1.0 - smoothstep(0.02, 0.34, tailCross));
        let outerWisp = field.z
            * smoothstep(0.86, 1.55, displacedDist)
            * (1.0 - smoothstep(1.55, 2.35, displacedDist))
            * (0.55 + 0.45 * n2);
        let softBody = plume * erosion * wakeCut;
        let rim = shell * (0.55 + 0.45 * n2) * (1.0 + field.z * 0.65);
        let softness = mix(0.35, 1.2, input.softness);
        let densityBoost = mix(0.85, 1.4, clamp(input.density - 0.8, 0.0, 1.0));
        let rippedBody = max(softBody * softness, rim * 0.9);
        let alpha = (rippedBody + tail * 0.9 + outerWisp * 0.6) * input.alpha * densityBoost;
        let coolTint = mix(input.color, vec3<f32>(0.82, 0.86, 0.9), rim * 0.35 + field.z * 0.28);
        let finalColor = mix(coolTint * 0.78, coolTint * 1.12, softBody + tail * 0.45);
        return vec4<f32>(finalColor * alpha, alpha);
    }

    let drift = vec2<f32>(uniforms.timeSec * 0.012, -uniforms.timeSec * 0.009);
    let warp = vec2<f32>(
        fbm(input.localPos * 2.2 + vec2<f32>(2.1, -0.7) + drift) - 0.5,
        fbm(input.localPos.yx * 2.0 + vec2<f32>(-1.3, 3.4) - drift * 0.8) - 0.5
    );
    let warpedLocal = input.localPos + warp * 0.18;
    let warpedDist = length(warpedLocal);
    let uv = warpedLocal * 2.35;
    let cloudA = fbm(uv + drift);
    let cloudB = fbm(uv.yx * 1.48 + vec2<f32>(3.4, -1.7) - drift * 0.82);
    let cloudC = fbm(uv * 2.2 + vec2<f32>(-4.1, 1.9) + drift * 0.24);
    let billow = clamp(cloudA * 0.5 + cloudB * 0.32 + cloudC * 0.18, 0.0, 1.0);
    let body = 1.0 - smoothstep(0.16 - w, 1.08 + w, warpedDist);
    let core = 1.0 - smoothstep(0.0, 0.46 + w, warpedDist);
    let shell = smoothstep(0.42, 1.02, warpedDist) * (1.0 - smoothstep(0.9 - w, 1.34 + w, warpedDist));
    let edgeWisps = shell * smoothstep(0.5, 0.92, billow) * 0.42;
    let voids = smoothstep(0.64, 0.95, cloudB) * body * (1.0 - core) * 0.26;
    let softSmoke = body * (0.34 + billow * 0.52) + core * 0.24 + edgeWisps - voids;
    let alpha = clamp(softSmoke * input.alpha * 1.16, 0.0, 0.92);

    let emberSmoke = vec3<f32>(0.44, 0.025, 0.018);
    let redBody = vec3<f32>(1.08, 0.035, 0.026);
    let hotRed = vec3<f32>(1.55, 0.08, 0.045);
    let warmCore = vec3<f32>(1.82, 0.2, 0.08);

    var finalColor = mix(emberSmoke, redBody, clamp(body * 0.76 + billow * 0.18, 0.0, 1.0));
    finalColor = mix(finalColor, hotRed, clamp(edgeWisps * 0.52 + core * 0.28, 0.0, 0.72));
    finalColor = mix(finalColor, warmCore, clamp(core * 0.22, 0.0, 0.28));
    finalColor = finalColor + shell * vec3<f32>(0.16, 0.006, 0.003);

    return vec4<f32>(finalColor * alpha, alpha);
}
