export type GPUContext = {
  device: GPUDevice;
  queue: GPUQueue;
  format: GPUTextureFormat;
  context: GPUCanvasContext;
};

const WEBGPU_KEY = "__webgpuContext";
const WEBGPU_CLEANUP_KEY = "__webgpuCleanup";

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    return true;
  }
  return false;
}
export async function initWebGPU(canvas: HTMLCanvasElement): Promise<GPUContext> {
  const anyCanvas = canvas as any;

  if (anyCanvas[WEBGPU_KEY]) {
    const cached = anyCanvas[WEBGPU_KEY] as GPUContext;
    resizeCanvasToDisplaySize(canvas);
    cached.context.configure({
      device: cached.device,
      format: cached.format,
      alphaMode: "premultiplied",
    });
    return cached;
  }

  if (!("gpu" in navigator)) {
    throw new Error("WebGPU not supported in this browser.");
  }

  let adapter = null;
  try {
    adapter = await navigator.gpu.requestAdapter({
      powerPreference: "low-power",
      forceFallbackAdapter: true,
    })
  } catch (e) {
    console.warn("Standard adapter request failed, checking for fallback...", e)
  }

  if (!adapter) {
    throw new Error(
      "Your GPU is blacklisted by your browser."
    )
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  if (!context) throw new Error("Failed to get WebGPU context.");

  const format = navigator.gpu.getPreferredCanvasFormat();

  const configure = () => {
    resizeCanvasToDisplaySize(canvas);
    context.configure({
      device,
      format,
      alphaMode: "premultiplied",
    });
  };

  configure();

  const ro = new ResizeObserver(configure);
  ro.observe(canvas);

  const vv = window.visualViewport;
  vv?.addEventListener("resize", configure);
  window.addEventListener("resize", configure);

  const rect = canvas.getBoundingClientRect();
  console.log(
    "rect:",
    rect.width,
    rect.height,
    "backing:",
    canvas.width,
    canvas.height,
    "dpr:",
    window.devicePixelRatio,
  );

  const gpuContext: GPUContext = {
    device,
    queue: device.queue,
    format,
    context,
  };

  anyCanvas[WEBGPU_KEY] = gpuContext;

  anyCanvas[WEBGPU_CLEANUP_KEY] = () => {
    ro.disconnect();
    vv?.removeEventListener("resize", configure);
    window.removeEventListener("resize", configure);
  };

  return gpuContext;
}
