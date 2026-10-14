import { ChannelType, type TextChannel } from 'discord.js';

import { discordClient } from './client.js';
import { CATEGORY_CHANNELS } from './channels.js';
import type { Category } from '../sources/categories.js';

export async function resolveNewsChannel(category: Category): Promise<TextChannel> {
  const channelId = CATEGORY_CHANNELS[category];

  const channel = await discordClient.channels.fetch(channelId);

  if (!channel) {
    throw new Error(`Discord channel not found for category ${category}`);
  }

  if (channel.type !== ChannelType.GuildText) {
    throw new Error(`Invalid Discord channel type for category ${category}`);
  }

  return channel;
}
