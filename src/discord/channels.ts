import { env } from '../config/env.js';

import type { Category } from '../sources/categories.js';

export const CATEGORY_CHANNELS: Record<Category, string> = {
  CYBER: env.DISCORD_CHANNEL_CYBER,
  IA: env.DISCORD_CHANNEL_IA,
  OS: env.DISCORD_CHANNEL_OS,
  HARDWARE: env.DISCORD_CHANNEL_HARDWARE,
  NEWS: env.DISCORD_CHANNEL_NEWS,
  GITHUB: env.DISCORD_CHANNEL_GITHUB,
  PODCASTS: env.DISCORD_CHANNEL_PODCASTS,
  DEVICES: env.DISCORD_CHANNEL_DEVICES,
  BUSINESS: env.DISCORD_CHANNEL_BUSINESS,
};
