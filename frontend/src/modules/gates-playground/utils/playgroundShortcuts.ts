export const SHORTCUTS: Record<string, { gate: string; label: string }> = {
  // Single Qubit Gates
  'h': { gate: 'H', label: 'H' },
  'x': { gate: 'X', label: 'X' },
  'y': { gate: 'Y', label: 'Y' },
  'z': { gate: 'Z', label: 'Z' },
  's': { gate: 'S', label: 'S' },
  'shift+s': { gate: 'Sdg', label: 'Shift+S' },
  't': { gate: 'T', label: 'T' },
  'shift+t': { gate: 'Tdg', label: 'Shift+T' },
  'p': { gate: 'P', label: 'P' },
  'r': { gate: 'RX', label: 'R' },
  'shift+r': { gate: 'RY', label: 'Shift+R' },
  'alt+r': { gate: 'RZ', label: 'Alt+R' },
  'u': { gate: 'U', label: 'U' },
  
  // Controlled Gates
  'c': { gate: 'CNOT', label: 'C' },
  'shift+c': { gate: 'CY', label: 'Shift+C' },
  'alt+c': { gate: 'CZ', label: 'Alt+C' },
  'alt+p': { gate: 'CP', label: 'Alt+P' },
  'w': { gate: 'SWAP', label: 'W' },
  
  // Special Gates
  'm': { gate: 'MEASURE', label: 'M' },
  'b': { gate: 'BARRIER', label: 'B' },
  '0': { gate: 'RESET', label: '0' },
  'f': { gate: 'QFT', label: 'F' },
  'shift+f': { gate: 'IQFT', label: 'Shift+F' },
};

export const getShortcutForGate = (gateName: string): string | undefined => {
  const entry = Object.values(SHORTCUTS).find(s => s.gate === gateName);
  return entry ? entry.label : undefined;
};

export const isEditableTarget = (target: EventTarget | null): boolean => {
  const checkElement = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    const tagName = el.tagName?.toUpperCase();
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
      return true;
    }
    if (el.isContentEditable) {
      return true;
    }
    if (
      el.classList?.contains('inputarea') ||
      el.closest?.('.monaco-editor') ||
      el.closest?.('.monaco-editor-container') ||
      el.closest?.('.react-monaco-editor-container') ||
      (typeof el.className === 'string' && el.className.includes('monaco'))
    ) {
      return true;
    }
    return false;
  };

  return checkElement(target as HTMLElement) || checkElement(document.activeElement as HTMLElement);
};
