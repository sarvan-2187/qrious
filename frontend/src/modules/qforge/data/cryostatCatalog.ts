export interface CryostatSpec {
  id: string;
  name: string;
  coolingPowerMxcUw: number; // Cooling power at MXC in microWatts
  plateDiameterMm: number;
  maxDriveLines: number;
  description: string;
}

export const CRYOSTAT_CATALOG: CryostatSpec[] = [
  {
    id: "ld450sl",
    name: "Bluefors LD450sl",
    coolingPowerMxcUw: 14, // >=14 µW at 20mK
    plateDiameterMm: 240,
    maxDriveLines: 12,
    description: "Compact cryostat with fast lead time and 14 µW cooling power at base temperature."
  },
  {
    id: "xld1000sl",
    name: "Bluefors XLD1000sl",
    coolingPowerMxcUw: 25, // 25 µW at 20mK
    plateDiameterMm: 350,
    maxDriveLines: 32,
    description: "High-capacity cryostat featuring 350mm MXC plate diameter and 25 µW cooling power for multi-qubit QPUs."
  }
];
