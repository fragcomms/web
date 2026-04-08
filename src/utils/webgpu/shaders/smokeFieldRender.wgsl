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

@group(0) @binding(0) var<uniform> uniforms : Uniforms;
@group(1) @binding(0) var smokeSampler : sampler;
@group(1) @binding(1) var smokeField : texture_2d<f32>;
@group(1) @binding(2) var<uniform> smokeParams : SmokeFieldParams;

struct VSOut {
    @builtin(position) position : vec4<f32>,
    @location(0) worldPos : vec2<f32>,
    @location(1) uv : vec2<f32>,
};

@vertex
fn vs_main(
    @location(0) worldPos : vec2<f32>,
    @location(1) uv : vec2<f32>,
) -> VSOut {
    var out : VSOut;
    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.worldPos = worldPos;
    out.uv = uv;
    return out;
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

@fragment
fn fs_main(input : VSOut) -> @location(0) vec4<f32> {
    let fieldSample = textureSampleLevel(smokeField, smokeSampler, input.uv, 0.0);
    let density = clamp(fieldSample.x, 0.0, 1.0);
    let disturbance = clamp(fieldSample.y, 0.0, 1.0);
    if (density < 0.01) {
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

    let body = smoothstep(0.01, 0.68, density);
    let core = smoothstep(0.09, 0.9, density);
    let edge = smoothstep(0.01, 0.12, density) * (1.0 - smoothstep(0.12, 0.32, density));
    let shell = smoothstep(0.04, 0.3, density) * (1.0 - smoothstep(0.26, 0.82, density));
    let breakUp = clamp(textureMask * 0.82 + pocket * 0.36 - curl * 0.12, 0.0, 1.0);
    let erosion = smoothstep(0.22, 0.93, density * 0.84 + breakUp * 0.34 - pocket * 0.08);
    let ragged = shell * smoothstep(0.44, 0.9, curl) * (0.18 + edge * 0.62);
    let tendrils = shell
        * smoothstep(0.54, 0.95, textureMask)
        * smoothstep(0.16, 0.86, pocket)
        * smoothstep(0.58, 0.92, filament)
        * 0.52;
    let clumps = smoothstep(0.2, 0.78, lowShape) * shell * 0.64;
    let voids = smoothstep(0.68, 0.94, pocket) * (1.0 - smoothstep(0.2, 0.56, density)) * 0.18;
    let internalShadow = smoothstep(0.16, 0.76, density) * (1.0 - textureMask * 0.3) * (0.74 + 0.26 * lowShape);
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
        * shell
        * smoothstep(0.12, 0.42, density)
        * smoothstep(0.08, 0.34, disturbance);
    let moteAlpha = moteMask * (0.006 + disturbance * 0.07 + tendrils * 0.02);

    var alpha = clamp(
        body * erosion * (0.68 + breakUp * 0.22)
        + core * 0.22
        + ragged * 0.24
        + tendrils * 0.28
        + clumps * 0.6
        + edge * 0.1
        - voids,
        0.0,
        0.985
    );
    alpha = alpha * smoothstep(0.008, 0.06, density);
    alpha = max(alpha, shell * 0.1 + ragged * 0.16);
    alpha = clamp(alpha + moteAlpha * 0.08, 0.0, 0.99);

    let soot = vec3<f32>(0.18, 0.19, 0.21);
    let base = vec3<f32>(0.27, 0.28, 0.31);
    let midColor = vec3<f32>(0.4, 0.42, 0.46);
    let highlight = vec3<f32>(0.55, 0.58, 0.63);
    let moteColor = vec3<f32>(0.6, 0.63, 0.68);
    var color = mix(soot, base, clamp(body * 0.62 + lowShape * 0.12, 0.0, 1.0));
    color = mix(color, midColor, clamp(textureMask * 0.24 + clumps * 0.28 + core * 0.14, 0.0, 0.78));
    color = mix(color, highlight, clamp(tendrils * 0.22 + ragged * 0.1, 0.0, 0.2));
    color = mix(color, soot * 0.86, internalShadow * 0.52 + voids * 0.34);
    color = mix(color, moteColor, clamp(moteAlpha * 0.9, 0.0, 0.06));

    return vec4<f32>(color * alpha, alpha);
}
