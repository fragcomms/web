export type GPUContext = {
    device: GPUDevice;
    queue: GPUQueue;
    format: GPUTextureFormat; 
    context: GPUCanvasContext;
};

export async function initWebGPU(canvas: HTMLCanvasElement): Promise<GPUContext> {
    if(!('gpu' in navigator)) {
        throw new Error("WebGPU not supported in this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("Failed to get GPU adapter.");

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    if (!context) throw new Error("Failed to get WebGPU context.");

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
        device,
        format,
        alphaMode: 'premultiplied',
    });

    return { device, queue: device.queue, format, context};
}