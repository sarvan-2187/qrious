export interface ComplexNumber {
  re: number;
  im: number;
}

export type QubitState = [ComplexNumber, ComplexNumber]; // [alpha, beta]

export interface BlochVector {
  u: number; // x coordinate (-1 to 1)
  v: number; // y coordinate (-1 to 1)
  w: number; // z coordinate (-1 to 1)
}

export interface TrajectoryPoint {
  x: number[];
  y: number[];
  z: number[];
  color: string;
}

export interface PulseParams {
  detuning: number;
  phase: number;
  amplitude: number;
  pulseLength: number;
}

export interface RotationParams {
  axis: 'x' | 'y' | 'z' | 'custom';
  angle: number; // in degrees
  polarAngle?: number; // theta in degrees
  azimuthalAngle?: number; // phi in degrees
}
