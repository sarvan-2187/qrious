import * as math from 'mathjs';
import type { QubitState, BlochVector, TrajectoryPoint } from '../types/quantum';

/**
 * Converts a 2D complex qubit state vector into 3D Bloch coordinates (u, v, w)
 */
export function stateToBlochVector(state: QubitState): BlochVector {
  const alpha = math.complex(state[0].re, state[0].im);
  const beta = math.complex(state[1].re, state[1].im);

  const r01 = math.multiply(alpha, math.conj(beta)) as math.Complex;
  const r00 = math.multiply(alpha, math.conj(alpha)) as math.Complex;
  const r11 = math.multiply(beta, math.conj(beta)) as math.Complex;

  const u = 2 * r01.re;
  const v = -2 * r01.im;
  const w = r00.re - r11.re;

  return { u, v, w };
}

/**
 * Returns initial |0> state
 */
export function getInitialState(): QubitState {
  return [
    { re: 1, im: 0 },
    { re: 0, im: 0 }
  ];
}

/**
 * Creates 2x2 unitary rotation matrix for Pauli X, Y, Z operators
 */
export function createRotationOperator(axis: 'x' | 'y' | 'z', angleRad: number): math.Matrix {
  const half = angleRad / 2;
  const cos = Math.cos(half);
  const sin = Math.sin(half);

  if (axis === 'x') {
    // R_x(theta) = [ [cos, -i*sin], [-i*sin, cos] ]
    return math.matrix([
      [math.complex(cos, 0), math.complex(0, -sin)],
      [math.complex(0, -sin), math.complex(cos, 0)]
    ]);
  } else if (axis === 'y') {
    // R_y(theta) = [ [cos, -sin], [sin, cos] ]
    return math.matrix([
      [math.complex(cos, 0), math.complex(-sin, 0)],
      [math.complex(sin, 0), math.complex(cos, 0)]
    ]);
  } else {
    // R_z(theta) = [ [exp(-i*theta/2), 0], [0, exp(i*theta/2)] ]
    return math.matrix([
      [math.complex(cos, -sin), math.complex(0, 0)],
      [math.complex(0, 0), math.complex(cos, sin)]
    ]);
  }
}

/**
 * Creates arbitrary rotation operator around custom axis n = (sin theta cos phi, sin theta sin phi, cos theta)
 */
export function createCustomAxisRotationOperator(
  polarDeg: number,
  azimuthalDeg: number,
  rotationDeg: number
): math.Matrix {
  const theta = (polarDeg * Math.PI) / 180;
  const phi = (azimuthalDeg * Math.PI) / 180;
  const gamma = (rotationDeg * Math.PI) / 180;

  const nx = Math.sin(theta) * Math.cos(phi);
  const ny = Math.sin(theta) * Math.sin(phi);
  const nz = Math.cos(theta);

  const half = gamma / 2;
  const cos = Math.cos(half);
  const sin = Math.sin(half);

  // R_n(gamma) = cos(gamma/2) I - i sin(gamma/2) (nx X + ny Y + nz Z)
  const a00 = math.complex(cos, -sin * nz);
  const a01 = math.complex(-sin * ny, -sin * nx);
  const a10 = math.complex(sin * ny, -sin * nx);
  const a11 = math.complex(cos, sin * nz);

  return math.matrix([
    [a00, a01],
    [a10, a11]
  ]);
}

/**
 * Creates Universal U3 gate operator U(θ, φ, λ)
 */
export function createU3Operator(thetaDeg: number, phiDeg: number, lambdaDeg: number): math.Matrix {
  const theta = (thetaDeg * Math.PI) / 180;
  const phi = (phiDeg * Math.PI) / 180;
  const lambda = (lambdaDeg * Math.PI) / 180;

  const half = theta / 2;
  const cos = Math.cos(half);
  const sin = Math.sin(half);

  // U = [ cos(θ/2),                 -e^{iλ} sin(θ/2) ]
  //     [ e^{iφ} sin(θ/2),   e^{i(φ+λ)} cos(θ/2) ]
  
  const a00 = math.complex(cos, 0);
  const a01 = math.complex(-Math.cos(lambda) * sin, -Math.sin(lambda) * sin);
  const a10 = math.complex(Math.cos(phi) * sin, Math.sin(phi) * sin);
  const a11 = math.complex(Math.cos(phi + lambda) * cos, Math.sin(phi + lambda) * cos);

  return math.matrix([
    [a00, a01],
    [a10, a11]
  ]);
}

/**
 * Creates standard quantum logic gate operators (H, S, S-dagger, T, T-dagger)
 */
export function getGateOperator(gate: 'H' | 'S' | 'Sdag' | 'T' | 'Tdag' | 'X' | 'Y' | 'Z'): math.Matrix {
  const invSqrt2 = 1 / Math.sqrt(2);
  switch (gate) {
    case 'H':
      return math.matrix([
        [math.complex(invSqrt2, 0), math.complex(invSqrt2, 0)],
        [math.complex(invSqrt2, 0), math.complex(-invSqrt2, 0)]
      ]);
    case 'S':
      return math.matrix([
        [math.complex(1, 0), math.complex(0, 0)],
        [math.complex(0, 0), math.complex(0, 1)]
      ]);
    case 'Sdag':
      return math.matrix([
        [math.complex(1, 0), math.complex(0, 0)],
        [math.complex(0, 0), math.complex(0, -1)]
      ]);
    case 'T':
      return math.matrix([
        [math.complex(1, 0), math.complex(0, 0)],
        [math.complex(0, 0), math.complex(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))]
      ]);
    case 'Tdag':
      return math.matrix([
        [math.complex(1, 0), math.complex(0, 0)],
        [math.complex(0, 0), math.complex(Math.cos(-Math.PI / 4), Math.sin(-Math.PI / 4))]
      ]);
    case 'X':
      return createRotationOperator('x', Math.PI);
    case 'Y':
      return createRotationOperator('y', Math.PI);
    case 'Z':
      return createRotationOperator('z', Math.PI);
  }
}

/**
 * Applies unitary transformation matrix to a qubit state
 */
export function applyUnitary(operator: math.Matrix, state: QubitState): QubitState {
  const stateVec = math.matrix([
    math.complex(state[0].re, state[0].im),
    math.complex(state[1].re, state[1].im)
  ]);
  const newState = math.multiply(operator, stateVec) as math.Matrix;
  const data = newState.toArray() as math.Complex[];

  // Normalize state vector
  const alpha = data[0];
  const beta = data[1];
  const norm = Math.sqrt(alpha.re * alpha.re + alpha.im * alpha.im + beta.re * beta.re + beta.im * beta.im);

  if (norm === 0) return state;

  return [
    { re: alpha.re / norm, im: alpha.im / norm },
    { re: beta.re / norm, im: beta.im / norm }
  ];
}

/**
 * Calculates trajectory points for rotations (Phosphor trace effect)
 */
export function calculateRotationTrajectory(
  axis: 'x' | 'y' | 'z',
  angleRad: number,
  initialState: QubitState,
  color: string,
  steps = 25
): TrajectoryPoint {
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];

  const initialVec = stateToBlochVector(initialState);
  x.push(initialVec.u);
  y.push(initialVec.v);
  z.push(initialVec.w);

  for (let i = 1; i <= steps; i++) {
    const stepAngle = (angleRad / steps) * i;
    const rotOp = createRotationOperator(axis, stepAngle);
    const stepState = applyUnitary(rotOp, initialState);
    const vec = stateToBlochVector(stepState);
    x.push(vec.u);
    y.push(vec.v);
    z.push(vec.w);
  }

  return { x, y, z, color };
}

/**
 * Calculates trajectory for arbitrary matrix transformation
 */
export function calculateOperatorTrajectory(
  operator: math.Matrix,
  initialState: QubitState,
  color: string,
  steps = 25
): TrajectoryPoint {
  const x: number[] = [];
  const y: number[] = [];
  const z: number[] = [];

  const initialVec = stateToBlochVector(initialState);
  x.push(initialVec.u);
  y.push(initialVec.v);
  z.push(initialVec.w);

  try {
    const a = operator.get([0, 0]) as math.Complex;
    const b = operator.get([0, 1]) as math.Complex;
    const c = operator.get([1, 0]) as math.Complex;
    const d = operator.get([1, 1]) as math.Complex;

    const trace = math.add(a, d) as math.Complex;
    const det = math.subtract(math.multiply(a, d), math.multiply(b, c)) as math.Complex;

    const trSq = math.multiply(trace, trace) as math.Complex;
    const fourDet = math.multiply(4, det) as math.Complex;
    const diff = math.subtract(trSq, fourDet) as math.Complex;
    const sqrtDiff = math.sqrt(diff) as math.Complex;

    const lambda1 = math.divide(math.add(trace, sqrtDiff), 2) as math.Complex;
    const lambda2 = math.divide(math.subtract(trace, sqrtDiff), 2) as math.Complex;

    const dist = math.abs(math.subtract(lambda1, lambda2)) as number;

    if (dist < 1e-9) {
      // Identity-like matrix, trace a direct path
      const finalState = applyUnitary(operator, initialState);
      const finalVec = stateToBlochVector(finalState);
      for (let i = 1; i <= steps; i++) {
        const frac = i / steps;
        const u = initialVec.u + (finalVec.u - initialVec.u) * frac;
        const v = initialVec.v + (finalVec.v - initialVec.v) * frac;
        const w = initialVec.w + (finalVec.w - initialVec.w) * frac;
        const r = Math.sqrt(u * u + v * v + w * w) || 1;
        x.push(u / r);
        y.push(v / r);
        z.push(w / r);
      }
      return { x, y, z, color };
    }

    const denom1 = math.subtract(lambda1, lambda2) as math.Complex;
    const denom2 = math.subtract(lambda2, lambda1) as math.Complex;

    // Projection operators: P1 = (U - lambda2 * I) / (lambda1 - lambda2)
    const p1_00 = math.divide(math.subtract(a, lambda2), denom1) as math.Complex;
    const p1_01 = math.divide(b, denom1) as math.Complex;
    const p1_10 = math.divide(c, denom1) as math.Complex;
    const p1_11 = math.divide(math.subtract(d, lambda2), denom1) as math.Complex;

    // P2 = (U - lambda1 * I) / (lambda2 - lambda1)
    const p2_00 = math.divide(math.subtract(a, lambda1), denom2) as math.Complex;
    const p2_01 = math.divide(b, denom2) as math.Complex;
    const p2_10 = math.divide(c, denom2) as math.Complex;
    const p2_11 = math.divide(math.subtract(d, lambda1), denom2) as math.Complex;

    const logL1 = math.log(lambda1) as math.Complex;
    const logL2 = math.log(lambda2) as math.Complex;

    for (let i = 1; i <= steps; i++) {
      const frac = i / steps;

      const l1_t = math.exp(math.multiply(frac, logL1) as math.Complex) as math.Complex;
      const l2_t = math.exp(math.multiply(frac, logL2) as math.Complex) as math.Complex;

      // U(t) = l1_t * P1 + l2_t * P2
      const u00 = math.add(math.multiply(l1_t, p1_00), math.multiply(l2_t, p2_00)) as math.Complex;
      const u01 = math.add(math.multiply(l1_t, p1_01), math.multiply(l2_t, p2_01)) as math.Complex;
      const u10 = math.add(math.multiply(l1_t, p1_10), math.multiply(l2_t, p2_10)) as math.Complex;
      const u11 = math.add(math.multiply(l1_t, p1_11), math.multiply(l2_t, p2_11)) as math.Complex;

      const stepOp = math.matrix([
        [u00, u01],
        [u10, u11]
      ]);

      const stepState = applyUnitary(stepOp, initialState);
      const vec = stateToBlochVector(stepState);
      x.push(vec.u);
      y.push(vec.v);
      z.push(vec.w);
    }
  } catch (err) {
    console.error("Error calculating exact quantum trajectory, falling back to linear:", err);
    const finalState = applyUnitary(operator, initialState);
    const finalVec = stateToBlochVector(finalState);
    for (let i = 1; i <= steps; i++) {
      const frac = i / steps;
      const u = initialVec.u + (finalVec.u - initialVec.u) * frac;
      const v = initialVec.v + (finalVec.v - initialVec.v) * frac;
      const w = initialVec.w + (finalVec.w - initialVec.w) * frac;
      const r = Math.sqrt(u * u + v * v + w * w) || 1;
      x.push(u / r);
      y.push(v / r);
      z.push(w / r);
    }
  }

  return { x, y, z, color };
}

/**
 * Calculates RF Pulse dynamics (Rabi oscillations)
 */
export function applyRabiPulse(
  axis: 'x' | 'y',
  time: number,
  detuning: number,
  amplitude: number,
  phaseDeg: number,
  state: QubitState
): QubitState {
  const detRad = 2 * Math.PI * detuning;
  const w1Rad = 2 * Math.PI * amplitude;
  let phaseRad = (Math.PI / 180) * phaseDeg;

  if (axis === 'x') {
    phaseRad += Math.PI / 2;
  }

  const cPlus = math.complex(0.5 * Math.cos(phaseRad), 0.5 * Math.sin(phaseRad));
  const cMinus = math.complex(0.5 * Math.cos(-phaseRad), 0.5 * Math.sin(-phaseRad));

  const opZ = math.matrix([
    [math.complex(0.5, 0), math.complex(0, 0)],
    [math.complex(0, 0), math.complex(-0.5, 0)]
  ]);
  const opT = math.matrix([
    [math.complex(0, 0), cPlus],
    [cMinus, math.complex(0, 0)]
  ]);

  const H0 = math.multiply(detRad, opZ) as math.Matrix;
  const H1 = math.multiply(w1Rad, opT) as math.Matrix;
  const Htotal = math.add(H0, H1) as math.Matrix;

  const rotOp = math.expm(math.multiply(math.complex(0, -time), Htotal) as math.Matrix) as math.Matrix;
  return applyUnitary(rotOp, state);
}
