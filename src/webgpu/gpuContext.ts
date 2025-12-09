export type GPUContext = {
    device: GPUDevice;
    queue: GPUQueue;
    format: GPUTextureFormat; 
    context: GPUCanvasContext;
};

const WEBGPU_KEY = "__webgpuContext";

export async function initWebGPU(canvas: HTMLCanvasElement): Promise<GPUContext> {
    const anyCanvas = canvas as any;
    
    if (anyCanvas[WEBGPU_KEY]){
        return anyCanvas[WEBGPU_KEY] as GPUContext;
    }

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

    const gpuContext: GPUContext = {
        device,
        queue: device.queue,
        format,
        context,
    };

    anyCanvas[WEBGPU_KEY] = gpuContext;

    return gpuContext;
}