struct Uniforms {
    viewProj : mat4x4<f32>,
    timeSec : f32,
    _pad0 : vec3<f32>,
};

@group(0) @binding(0)
var<uniform> uniforms : Uniforms;

struct VSOut {
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec3<f32>,
    @location(1) uv : vec2<f32>,
    @location(2) life : f32,
};

@vertex
fn vs_main(
    @location(0) a_pos      : vec2<f32>,
    @location(1) i_start    : vec2<f32>,
    @location(2) i_end      : vec2<f32>,
    @location(3) i_life     : f32,
    @location(4) i_color    : vec3<f32>,
) -> VSOut {
    var out : VSOut;

    let dir = i_end - i_start;
    let len = max(length(dir), 0.0001);
    let tangent = dir / len;
    let normal = vec2<f32>(-tangent.y, tangent.x);

    let thickness = 6.0;

    let along = (a_pos.x + 1.0) * 0.5;
    let side = a_pos.y * thickness * 0.5;

    let worldPos = i_start + tangent * (along * len) + normal * side;

    out.position = uniforms.viewProj * vec4<f32>(worldPos, 0.0, 1.0);
    out.color = i_color;
    out.uv = a_pos;
    out.life = i_life;

    return out;
}

@fragment
fn fs_main(input: VSOut) -> @location(0) vec4<f32> {
    let side = abs(input.uv.y);
    let along = (input.uv.x + 1.0) * 0.5;

    let wSide = fwidth(side);

    //bright inner core
    let core = 1.0 - smoothstep(0.04 - wSide, 0.16 + wSide, side);

    //wider outer glow
    let glow1 = 1.0 - smoothstep(0.08 - wSide, 1.2 + wSide, side);
    let glow2 = 1.0 - smoothstep(0.2 - wSide, 1.8 + wSide, side);

    //subtle animated shimmer
    let shimmer = 0.5 + 0.5 * sin(along * 30.0 - uniforms.timeSec * 35.0);
    let liquidGlow = glow2 * (0.55 + 0.45 * shimmer);

    //stronger toward the head
    let headBoost = 0.6 + 0.8 * along;

    let alpha = (core * 1.2 + glow1 * 0.75 + liquidGlow * 0.55) * input.life * headBoost;

    let coreColor = input.color;

    let glowColor1 = mix(input.color, vec3<f32>(1, 0.0, 0.0), 0.55);
    let glowColor2 = mix(input.color, vec3<f32>(1, 0.0, 0.0), 0.85);

    let finalColor = 
        coreColor * (core * 2.2) + 
        glowColor1 * (glow1 * 1.2) +
        glowColor2 * (liquidGlow * 0.8);

    return vec4<f32>(finalColor * alpha, alpha);
}