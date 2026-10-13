export const CATEGORIES = ['CYBER', 'IA', 'OS', 'HARDWARE', 'NEWS', 'GITHUB'] as const;

export type Category = (typeof CATEGORIES)[number];
