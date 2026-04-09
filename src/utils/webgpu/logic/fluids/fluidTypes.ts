export type FluidSimPipelineSet = {
  velocityAdvectPipeline: GPURenderPipeline;
  forceInjectPipeline: GPURenderPipeline;
  divergencePipeline: GPURenderPipeline;
  pressureSolvePipeline: GPURenderPipeline;
  projectPipeline: GPURenderPipeline;
  densityPipeline: GPURenderPipeline;
  velocityAdvectLayout: GPUBindGroupLayout;
  forceInjectLayout: GPUBindGroupLayout;
  divergenceLayout: GPUBindGroupLayout;
  pressureSolveLayout: GPUBindGroupLayout;
  projectLayout: GPUBindGroupLayout;
  densityLayout: GPUBindGroupLayout;
};

export type FluidCheckpoint = {
  stepIndex: number;
  velocityTexture: GPUTexture;
  densityTexture: GPUTexture;
  previousPlayers: Map<string, { x: number; y: number; }>;
};