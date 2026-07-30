export type StageId = "300K" | "50K" | "4K" | "still" | "coldplate" | "mxc";

export interface ThermalStage {
  id: StageId;
  name: string;
  targetTempK: number;
  description: string;
}

export const STAGES: Record<StageId, ThermalStage> = {
  "300K": { id: "300K", name: "Room Temperature", targetTempK: 300, description: "Room temperature environment where control electronics reside." },
  "50K": { id: "50K", name: "50K Stage", targetTempK: 50, description: "First cooling stage, typically cooled by a pulse tube cooler." },
  "4K": { id: "4K", name: "4K Stage", targetTempK: 4, description: "Second cooling stage, providing 4 Kelvin environment. HEMTs are typically placed here." },
  "still": { id: "still", name: "Still", targetTempK: 0.7, description: "The still of the dilution refrigerator, typically around 700 mK." },
  "coldplate": { id: "coldplate", name: "Cold Plate", targetTempK: 0.1, description: "Cold plate stage, typically around 100 mK." },
  "mxc": { id: "mxc", name: "Mixing Chamber", targetTempK: 0.015, description: "Mixing chamber (MXC), the coldest stage where the QPU and TWPA reside (10-20 mK)." }
};
