export interface CryostatSpec {
  id: string;
  name: string;
  coolingPowerMxcUw: number; // Cooling power at MXC in microWatts
  description: string;
}

export const CRYOSTAT_CATALOG: CryostatSpec[] = [
  {
    id: "ld450sl",
    name: "Bluefors LD450sl",
    coolingPowerMxcUw: 14, // >=14 µW at 20mK from the brief
    description: "Budget-constrained first system with fast lead time."
  }
];
