// Domain mapper for Algorithm Constellation
// Maps algorithm categories → educational domains, providing colors and cluster positions.

export type Domain =
  | 'Search'
  | 'Optimization'
  | 'Simulation'
  | 'Machine Learning'
  | 'Cryptography'
  | 'Communication'
  | 'Error Correction'
  | 'Chemistry'
  | 'Sensing'
  | 'Foundations'
  | 'Other';

export const ALL_DOMAINS: Domain[] = [
  'Foundations',
  'Search',
  'Optimization',
  'Simulation',
  'Machine Learning',
  'Cryptography',
  'Communication',
  'Error Correction',
  'Chemistry',
  'Sensing',
];

// Map from category string fragments → domain
const CATEGORY_TO_DOMAIN: Array<{ pattern: RegExp; domain: Domain }> = [
  { pattern: /grover|search|amplitude estimation/i, domain: 'Search' },
  { pattern: /optim|qaoa|vqe|annealing|variational|finance/i, domain: 'Optimization' },
  { pattern: /simul|hamiltonian|trotter|quantum walk|walk/i, domain: 'Simulation' },
  { pattern: /machine learning|qml|quantum ml|kernel|svm|classifier|neural/i, domain: 'Machine Learning' },
  { pattern: /cryptograph|shor|bb84|e91|key distribution|factoring/i, domain: 'Cryptography' },
  { pattern: /communication|teleport|superdense|entangl|swap|bell/i, domain: 'Communication' },
  { pattern: /error correct|fault.toleran|surface code|stabilizer|repetition|code/i, domain: 'Error Correction' },
  { pattern: /chemistry|molecule|vqe|hartree|quantum chemical/i, domain: 'Chemistry' },
  { pattern: /sens|phase estimat|metrology|clock|gravit/i, domain: 'Sensing' },
  { pattern: /foundation|state|ghz|w.state|superposit|basic|primitiv/i, domain: 'Foundations' },
];

export function getAlgorithmDomain(category: string, name: string): Domain {
  const haystack = `${category} ${name}`;
  for (const { pattern, domain } of CATEGORY_TO_DOMAIN) {
    if (pattern.test(haystack)) return domain;
  }
  return 'Other';
}

// Dark/light color tokens per domain
export const DOMAIN_COLORS: Record<Domain, { dark: string; light: string; hex: string }> = {
  Foundations:      { dark: '#a78bfa', light: '#7c3aed', hex: '#a78bfa' }, // violet
  Search:           { dark: '#22d3ee', light: '#0891b2', hex: '#22d3ee' }, // cyan
  Optimization:     { dark: '#34d399', light: '#059669', hex: '#34d399' }, // emerald
  Simulation:       { dark: '#818cf8', light: '#4338ca', hex: '#818cf8' }, // indigo
  'Machine Learning':{ dark: '#f472b6', light: '#be185d', hex: '#f472b6' }, // pink
  Cryptography:     { dark: '#f87171', light: '#dc2626', hex: '#f87171' }, // red
  Communication:    { dark: '#60a5fa', light: '#2563eb', hex: '#60a5fa' }, // blue
  'Error Correction':{ dark: '#fb923c', light: '#ea580c', hex: '#fb923c' }, // orange
  Chemistry:        { dark: '#4ade80', light: '#16a34a', hex: '#4ade80' }, // green
  Sensing:          { dark: '#facc15', light: '#ca8a04', hex: '#facc15' }, // yellow
  Other:            { dark: '#71717a', light: '#52525b', hex: '#71717a' }, // zinc
};

// `hex` is just the dark value — reading it directly is what made every domain
// colour wash out on the light background. Use this instead.
export const domainHex = (domain: Domain | undefined, isDark: boolean): string =>
  (DOMAIN_COLORS[domain ?? 'Other'] ?? DOMAIN_COLORS.Other)[isDark ? 'dark' : 'light'];

// Cluster seed positions (normalized 0-1 in a 1000×700 canvas space)
// Arranged so galaxies don't overlap. These are CENTER points for each domain group.
export const DOMAIN_CLUSTER_SEEDS: Record<Domain, { x: number; y: number }> = {
  Foundations:       { x: 500, y: 350 }, // center
  Search:            { x: 200, y: 150 }, // top-left
  Optimization:      { x: 500, y: 100 }, // top-center
  Simulation:        { x: 800, y: 150 }, // top-right
  'Machine Learning':{ x: 880, y: 380 }, // right
  Cryptography:      { x: 750, y: 580 }, // bottom-right
  Communication:     { x: 500, y: 620 }, // bottom-center
  'Error Correction':{ x: 250, y: 580 }, // bottom-left
  Chemistry:         { x: 120, y: 380 }, // left
  Sensing:           { x: 200, y: 570 }, // far bottom-left
  Other:             { x: 500, y: 350 }, // fallback to center
};
