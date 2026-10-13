import { InteractionContextType, SlashCommandBuilder } from 'discord.js';

const commandDefinitions = [
  ['cyber', 'Run the cybersecurity news job'],
  ['ia', 'Run the artificial intelligence news job'],
  ['os', 'Run the operating systems news job'],
  ['hardware', 'Run the hardware news job'],
  ['news', 'Run the general technology news job'],
  ['github', 'Run the GitHub trending job'],
  ['resume', 'Generate a Markdown article from selected news'],
  ['budget', 'Show the OpenRouter budget'],
] as const;

export const commands = [
  ...commandDefinitions.map(([name, description]) =>
    new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)
      .setContexts(InteractionContextType.Guild),
  ),

  new SlashCommandBuilder()
    .setName('language')
    .setDescription('Change the language of generated content')
    .setContexts(InteractionContextType.Guild)
    .addStringOption((option) =>
      option
        .setName('value')
        .setDescription('Language for news summaries and Markdown articles')
        .setRequired(true)
        .addChoices({ name: 'French', value: 'fr' }, { name: 'English', value: 'en' }),
    ),
];

export const commandNames = new Set(commands.map((command) => command.name));
