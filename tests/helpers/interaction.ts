import { ChatInputCommandInteraction, CommandInteractionOptionResolver, User } from 'discord.js';
import { vi } from 'vitest';

export function commandInteraction(
  commandName: string,
  value = 'CYBER',
): ReturnType<typeof vi.mockObject<ChatInputCommandInteraction>> {
  const interaction = vi.mockObject(ChatInputCommandInteraction.prototype);
  const options = vi.mockObject(CommandInteractionOptionResolver.prototype);
  const user = vi.mockObject(User.prototype);
  Object.assign(user, { id: 'user' });
  Object.assign(interaction, { commandName, guildId: 'guild', user, options });
  options.getString.mockReturnValue(value);
  return interaction;
}
