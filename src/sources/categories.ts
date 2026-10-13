export const CATEGORIES = [
  'CYBER',
  'IA',
  'OS',
  'HARDWARE',
  'NEWS',
  'GITHUB',
  'DEVICES',
  'BUSINESS',
  'PODCASTS',
] as const;

export type Category = (typeof CATEGORIES)[number];
