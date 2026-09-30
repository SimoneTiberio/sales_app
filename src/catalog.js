import catalogData from '../catalog.example.json' with { type: 'json' };
export const catalog = catalogData;
export const workloads = { training: 'Training', inference: 'Inference', tuning: 'Fine Tuning', hpc: 'HPC', digitalTwin: 'Digital Twin', mixed: 'Mixed Workload' };
