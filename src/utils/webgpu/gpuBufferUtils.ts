export function createFloat32Buffer(
  device: GPUDevice,
  data: Float32Array,
  usage: GPUBufferUsageFlags,
): GPUBuffer {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });
  new Float32Array(buffer.getMappedRange()).set(data);
  buffer.unmap();
  return buffer;
}

export function createDynamicBuffer(
  device: GPUDevice,
  size: number,
  usage: GPUBufferUsageFlags,
): GPUBuffer {
  return device.createBuffer({ size, usage });
}

export function writeFloat32Slice(
  queue: GPUQueue,
  buffer: GPUBuffer,
  data: Float32Array,
  floatCount = data.length,
) {
  queue.writeBuffer(buffer, 0, data.subarray(0, floatCount));
}
