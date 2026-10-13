import { InteractionContextType, SlashCommandBuilder } from 'discord.js';

const commandDefinitions = [
  {
    name: 'cyber',
    description: 'Start the cybersecurity watch',
  },
  {
    name: 'ia',
    description: 'Start the artificial intelligence watch',
  },
  {
    name: 'os',
    description: "Start the operating systems watch",
  },
  {
    name: 'hardware',
    description: 'Start the hardware watch',
  },
  {
    name: 'news',
    description: 'Start the general technology watch',
  },
  {
    name: 'github',
    description: 'Start the GitHub repository watch',
  },
  {
    name: 'resume',
    description: 'Generate a Markdown article from the selected news',
  },
  {
    name: 'budget',
    description: 'View the OpenRouter budget',
  },
  {
    name: 'language',
    description: 'Change the language of generated content',
  },
] as const;

export type CommandName = (typeof commandDefinitions)[number]['name'];

export const commandNames = new Set<string>(commandDefinitions.map((command) => command.name));

export const commands = commandDefinitions.map((command) =>
  new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description)
    .setContexts(InteractionContextType.Guild),
);
