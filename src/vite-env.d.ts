/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />
/// <reference types="@webgpu/types" />

declare module '*wgsl?raw' {
    const source: string;
    export default source;
}