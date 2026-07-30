import type { BuildGraphState } from '../hooks/useBuildState';
import { COMPONENTS } from '../constants/components';

export interface ValidationResult {
  valid: boolean;
  messages: string[];
}

export const validateSignalChain = (graph: BuildGraphState): ValidationResult => {
  const messages: string[] = [];
  let valid = true;

  // Pre-check for drive line attenuation budget (~62 dB total)
  const driveComponents = graph.placedComponents.filter(c => c.line === 'drive');
  let totalAtt = 0;
  
  driveComponents.forEach(pc => {
    const spec = COMPONENTS.find(c => c.id === pc.componentId);
    if (spec && spec.attenuationDb) {
      totalAtt += spec.attenuationDb;
    }
  });

  if (driveComponents.length > 0 && (totalAtt < 59 || totalAtt > 65)) {
    valid = false;
    messages.push(`Drive line attenuation is ${totalAtt} dB. Target is ~62 dB (±3 dB).`);
  }

  // Pre-check for readout order (basic check)
  const readoutComponents = graph.placedComponents.filter(c => c.line === 'readout');
  const purcellIndex = readoutComponents.findIndex(c => c.componentId === 'purcell_filter');
  const twpaIndex = readoutComponents.findIndex(c => c.componentId === 'twpa');
  const hemtIndex = readoutComponents.findIndex(c => c.componentId === 'hemt');

  if (purcellIndex !== -1 && twpaIndex !== -1 && purcellIndex > twpaIndex) {
    valid = false;
    messages.push('Purcell filter should precede TWPA in the readout chain.');
  }
  if (twpaIndex !== -1 && hemtIndex !== -1 && twpaIndex > hemtIndex) {
    valid = false;
    messages.push('TWPA should precede HEMT in the readout chain.');
  }

  return { valid, messages };
};
