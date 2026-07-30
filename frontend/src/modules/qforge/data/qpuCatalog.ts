export interface QpuSpec {
  id: string;
  name: string;
  qubits: number;
  description: string;
  recommendedCryostat: string;
}

export const QPU_CATALOG: QpuSpec[] = [
  {
    id: "contralto_a",
    name: "QuantWare Contralto-A",
    qubits: 17,
    description: "17-qubit superconducting QPU, recommended for a first serious build.",
    recommendedCryostat: "ld450sl"
  }
];
