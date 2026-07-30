export type Complex = [number, number]; // [real, imag]
export type Matrix = Complex[][];

const C = (re: number, im: number = 0): Complex => [re, im];

const INV_SQRT_2 = 1 / Math.sqrt(2);

export const complexAdd = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]];
export const complexMul = (a: Complex, b: Complex): Complex => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
export const complexConj = (a: Complex): Complex => [a[0], -a[1]];
export const complexMag = (a: Complex): number => Math.sqrt(a[0] * a[0] + a[1] * a[1]);
export const complexPhase = (a: Complex): number => Math.atan2(a[1], a[0]);

export const multiplyMatrices = (A: Matrix, B: Matrix): Matrix => {
  const rA = A.length, cA = A[0].length, cB = B[0].length;
  const C: Matrix = Array(rA).fill(0).map(() => Array(cB).fill([0, 0] as Complex));
  for (let i = 0; i < rA; i++) {
    for (let j = 0; j < cB; j++) {
      let sum: Complex = [0, 0];
      for (let k = 0; k < cA; k++) {
        sum = complexAdd(sum, complexMul(A[i][k], B[k][j]));
      }
      C[i][j] = sum;
    }
  }
  return C;
};

export const adjointMatrix = (A: Matrix): Matrix => {
  const rA = A.length, cA = A[0].length;
  const C: Matrix = Array(cA).fill(0).map(() => Array(rA).fill([0, 0] as Complex));
  for (let i = 0; i < rA; i++) {
    for (let j = 0; j < cA; j++) {
      C[j][i] = complexConj(A[i][j]);
    }
  }
  return C;
};

export const tensorProduct = (A: Matrix, B: Matrix): Matrix => {
  const rA = A.length, cA = A[0].length;
  const rB = B.length, cB = B[0].length;
  const C: Matrix = Array(rA * rB).fill(0).map(() => Array(cA * cB).fill([0, 0] as Complex));
  for (let i = 0; i < rA; i++) {
    for (let j = 0; j < cA; j++) {
      for (let k = 0; k < rB; k++) {
        for (let l = 0; l < cB; l++) {
          C[i * rB + k][j * cB + l] = complexMul(A[i][j], B[k][l]);
        }
      }
    }
  }
  return C;
};

const U_PM: Matrix = [
  [C(INV_SQRT_2), C(INV_SQRT_2)],
  [C(INV_SQRT_2), C(-INV_SQRT_2)]
];

const U_I: Matrix = [
  [C(INV_SQRT_2), C(INV_SQRT_2)],
  [C(0, INV_SQRT_2), C(0, -INV_SQRT_2)]
];

export const transformMatrixBasis = (M: Matrix, basis: string): Matrix => {
  if (basis === '01') return M;
  
  let U: Matrix;
  if (basis === '+-') U = U_PM;
  else if (basis === '+i-i') U = U_I;
  else return M;

  let n = Math.log2(M.length);
  let U_n = U;
  for (let i = 1; i < n; i++) {
    U_n = tensorProduct(U_n, U);
  }

  const U_n_dag = adjointMatrix(U_n);
  return multiplyMatrices(multiplyMatrices(U_n_dag, M), U_n);
};


export const GATE_MATRICES: Record<string, Matrix> = {
  'H': [
    [C(INV_SQRT_2), C(INV_SQRT_2)],
    [C(INV_SQRT_2), C(-INV_SQRT_2)]
  ],
  'X': [
    [C(0), C(1)],
    [C(1), C(0)]
  ],
  'Y': [
    [C(0), C(0, -1)],
    [C(0, 1), C(0)]
  ],
  'Z': [
    [C(1), C(0)],
    [C(0), C(-1)]
  ],
  'S': [
    [C(1), C(0)],
    [C(0), C(0, 1)]
  ],
  'SDG': [
    [C(1), C(0)],
    [C(0), C(0, -1)]
  ],
  'T': [
    [C(1), C(0)],
    [C(0), C(INV_SQRT_2, INV_SQRT_2)] // e^(i pi/4)
  ],
  'TDG': [
    [C(1), C(0)],
    [C(0), C(INV_SQRT_2, -INV_SQRT_2)] // e^(-i pi/4)
  ],
  'I': [
    [C(1), C(0)],
    [C(0), C(1)]
  ],
  'CNOT': [
    [C(1), C(0), C(0), C(0)],
    [C(0), C(1), C(0), C(0)],
    [C(0), C(0), C(0), C(1)],
    [C(0), C(0), C(1), C(0)]
  ],
  'CZ': [
    [C(1), C(0), C(0), C(0)],
    [C(0), C(1), C(0), C(0)],
    [C(0), C(0), C(1), C(0)],
    [C(0), C(0), C(0), C(-1)]
  ],
  'SWAP': [
    [C(1), C(0), C(0), C(0)],
    [C(0), C(0), C(1), C(0)],
    [C(0), C(1), C(0), C(0)],
    [C(0), C(0), C(0), C(1)]
  ]
};

// Generates parameterised matrix if applicable, else falls back to static.
export const getGateMatrix = (name: string, params?: number[]): Matrix => {
  const gName = name.toUpperCase();
  
  if (gName === 'RX' && params && params.length > 0) {
    const theta = params[0];
    return [
      [C(Math.cos(theta/2)), C(0, -Math.sin(theta/2))],
      [C(0, -Math.sin(theta/2)), C(Math.cos(theta/2))]
    ];
  }
  
  if (gName === 'RY' && params && params.length > 0) {
    const theta = params[0];
    return [
      [C(Math.cos(theta/2)), C(-Math.sin(theta/2))],
      [C(Math.sin(theta/2)), C(Math.cos(theta/2))]
    ];
  }

  if (gName === 'RZ' && params && params.length > 0) {
    const theta = params[0];
    return [
      [C(Math.cos(theta/2), -Math.sin(theta/2)), C(0)],
      [C(0), C(Math.cos(theta/2), Math.sin(theta/2))]
    ];
  }

  if (gName === 'P' && params && params.length > 0) {
    const theta = params[0];
    return [
      [C(1), C(0)],
      [C(0), C(Math.cos(theta), Math.sin(theta))]
    ];
  }
  
  if (gName === 'U' && params && params.length >= 3) {
    const [theta, phi, lam] = params;
    return [
      [C(Math.cos(theta/2)), C(-Math.sin(theta/2) * Math.cos(lam), -Math.sin(theta/2) * Math.sin(lam))],
      [C(Math.sin(theta/2) * Math.cos(phi), Math.sin(theta/2) * Math.sin(phi)), C(Math.cos(theta/2) * Math.cos(phi + lam), Math.cos(theta/2) * Math.sin(phi + lam))]
    ];
  }

  return GATE_MATRICES[gName] || GATE_MATRICES['I'];
};
