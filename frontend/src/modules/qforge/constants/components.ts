import type { StageId } from "./stages";

export type ComponentKind = "attenuator" | "filter" | "hemt" | "twpa" | "circulator" | "dc_block" | "digitizer";

export interface ComponentSpec {
  id: string;
  name: string;
  kind: ComponentKind;
  validStages: StageId[];
  attenuationDb?: number;
  gainDb?: number;
  noiseTempK?: number;
  specSource: string;
  description: string;
}

export const COMPONENTS: ComponentSpec[] = [
  {
    id: "att_20db",
    name: "20 dB Attenuator",
    kind: "attenuator",
    validStages: ["50K", "mxc"],
    attenuationDb: 20,
    specSource: "The drive line: Total attenuation budget = 62 dB (20+6+6+10+20)",
    description: "High attenuation value, typically placed at higher temperature stages (like 50K) or the final MXC stage."
  },
  {
    id: "att_10db",
    name: "10 dB Attenuator",
    kind: "attenuator",
    validStages: ["coldplate"],
    attenuationDb: 10,
    specSource: "The drive line: Total attenuation budget = 62 dB (20+6+6+10+20)",
    description: "Medium attenuation value, typically placed at the cold plate."
  },
  {
    id: "att_6db",
    name: "6 dB Attenuator",
    kind: "attenuator",
    validStages: ["4K", "still"],
    attenuationDb: 6,
    specSource: "The drive line: Total attenuation budget = 62 dB (20+6+6+10+20)",
    description: "Lower attenuation value, typically used at intermediate stages like 4K or Still."
  },
  {
    id: "ir_filter",
    name: "IR Filter",
    kind: "filter",
    validStages: ["coldplate", "mxc"],
    specSource: "IR filters are critical: they absorb infrared photons... degrading T1",
    description: "Filters out infrared radiation. Must be placed at the coldest stages."
  },
  {
    id: "purcell_filter",
    name: "Purcell Filter",
    kind: "filter",
    validStages: ["mxc"],
    specSource: "Readout chain: Purcell filter... TWPA... circulator... circulator... HEMT... digitizer",
    description: "Protects qubits from spontaneous emission into the readout line."
  },
  {
    id: "twpa",
    name: "TWPA",
    kind: "twpa",
    validStages: ["mxc"],
    gainDb: 20, // ~20 dB, 4–8 GHz from brief
    specSource: "At the mixing chamber... TWPA",
    description: "Traveling-Wave Parametric Amplifier providing near quantum-limited amplification."
  },
  {
    id: "circulator",
    name: "Circulator",
    kind: "circulator",
    validStages: ["mxc", "4K"],
    specSource: "Readout chain: Purcell filter... TWPA... circulator... circulator... HEMT... digitizer",
    description: "Provides directional signal flow, protecting upstream components from reflected noise."
  },
  {
    id: "hemt",
    name: "HEMT Amplifier",
    kind: "hemt",
    validStages: ["4K"],
    gainDb: 35,
    noiseTempK: 3, // 2-4K from brief
    specSource: "At 4 K, a HEMT... provides the first high-gain amplification",
    description: "High Electron Mobility Transistor amplifier. Provides significant gain at 4K."
  },
  {
    id: "dc_block",
    name: "DC Block",
    kind: "dc_block",
    validStages: ["300K", "50K"],
    specSource: "Standard component to prevent DC ground loops.",
    description: "Prevents DC signals and ground loops from traveling down the RF lines."
  },
  {
    id: "digitizer",
    name: "Digitizer / Room Temp Electronics",
    kind: "digitizer",
    validStages: ["300K"],
    specSource: "Readout chain ends at the digitizer at 300K",
    description: "Room temperature ADC/DAC and control logic."
  }
];
