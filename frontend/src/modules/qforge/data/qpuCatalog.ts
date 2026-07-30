export interface QpuSpec {
  id: string;
  name: string;
  qubits: number;
  description: string;
  heatLoadUw: number;
  minPlateDiameterMm: number;
  baseT1Us: number;
  recommendedCryostat: string;
}

export const QPU_CATALOG: QpuSpec[] = [
  {
    id: "contralto_a",
    name: "QuantWare Contralto-A",
    qubits: 17,
    description: "17-qubit superconducting QPU with planar transmon architecture. Recommended for standard dilution refrigerators.",
    heatLoadUw: 10,
    minPlateDiameterMm: 200,
    baseT1Us: 45,
    recommendedCryostat: "ld450sl"
  },
  {
    id: "rigetti_novera",
    name: "Rigetti Novera",
    qubits: 9,
    description: "9-qubit high-coherence QPU featuring 9-qubit square lattice and 3-qubit coupler ring. Requires large MXC stage clearance.",
    heatLoadUw: 18,
    minPlateDiameterMm: 290,
    baseT1Us: 65,
    recommendedCryostat: "xld1000sl"
  }
];
