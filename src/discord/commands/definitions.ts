import { InteractionContextType, SlashCommandBuilder } from 'discord.js';

const commandDefinitions = [
  ['cyber', 'Run the cybersecurity news job'],
  ['ia', 'Run the artificial intelligence news job'],
  ['os', 'Run the operating systems news job'],
  ['hardware', 'Run the hardware news job'],
  ['news', 'Run the general technology news job'],
  ['github', 'Run the GitHub trending job'],
  ['summarize', 'Generate a Markdown article from selected news'],
  ['budget', 'Show the OpenRouter budget'],
  ['podcast', 'Latest relevant podcasts episodes'],
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

  new SlashCommandBuilder()
    .setName('more')
    .setDescription('Publish three additional unpublished articles')
    .setContexts(InteractionContextType.Guild)
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Technology news category')
        .setRequired(true)
        .addChoices(
          { name: 'Cybersecurity', value: 'CYBER' },
          { name: 'Artificial Intelligence', value: 'IA' },
          { name: 'Operating Systems', value: 'OS' },
          { name: 'Hardware', value: 'HARDWARE' },
          { name: 'Technology', value: 'NEWS' },
          { name: 'GitHub', value: 'GITHUB' },
        ),
    ),

  new SlashCommandBuilder()
    .setName('podcasts')
    .setDescription('Fetch and publish recent technology podcast episodes')
    .setContexts(InteractionContextType.Guild),
];

export const commandNames = new Set(commands.map((command) => command.name));
