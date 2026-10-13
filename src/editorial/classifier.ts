import type { Category } from '../sources/categories.js';
import type { CollectedArticle } from '../sources/rss.provider.js';

type ClassifiedCategory = Exclude<Category, 'GITHUB'>;

const RULES: Record<Exclude<ClassifiedCategory, 'NEWS'>, RegExp[]> = {
  CYBER: [
    /\bCVE-\d{4}-\d{4,}\b/i,
    /\bzero[- ]day\b/i,
    /\bvulnerabilit(?:y|ies)\b/i,
    /\bransomware\b/i,
    /\bdata breach\b/i,
    /\bcyberattack\b/i,
    /\bmalware\b/i,
    /\bphishing\b/i,
    /\bexploited\b/i,
    /\bsecurity flaw\b/i,
  ],

  IA: [
    /\bAI model\b/i,
    /\blanguage model\b/i,
    /\bLLMs?\b/i,
    /\bmachine learning\b/i,
    /\bdeep learning\b/i,
    /\bAI agents?\b/i,
    /\bAI research\b/i,
    /\bneural network\b/i,
    /\bmodel training\b/i,
    /\bAI benchmark\b/i,
    /\bartificial intelligence\b/i,
  ],

  OS: [
    /\bWindows (?:10|11|12|Server)\b/i,
    /\bmacOS\b/i,
    /\biOS\b/i,
    /\biPadOS\b/i,
    /\bAndroid (?:\d+|update|release)\b/i,
    /\bLinux kernel\b/i,
    /\bUbuntu\b/i,
    /\bFedora\b/i,
    /\bDebian\b/i,
    /\bArch Linux\b/i,
    /\boperating system\b/i,
  ],

  HARDWARE: [
    /\bCPU\b/i,
    /\bGPU\b/i,
    /\bprocessors?\b/i,
    /\bsemiconductors?\b/i,
    /\bgraphics cards?\b/i,
    /\bchipsets?\b/i,
    /\bDRAM\b/i,
    /\bNVMe\b/i,
    /\bPCIe\b/i,
    /\bdata center chips?\b/i,
    /\bRyzen\b/i,
    /\bGeForce\b/i,
    /\bRadeon\b/i,
  ],

  DEVICES: [
    /\bsmartphones?\b/i,
    /\bsmartwatches?\b/i,
    /\bwearables?\b/i,
    /\bsmart home\b/i,
    /\bconnected home\b/i,
    /\bHomeView\b/i,
    /\bsmart TVs?\b/i,
    /\btablets?\b/i,
    /\biPhones?\b/i,
    /\biPads?\b/i,
    /\bPixel (?:phone|watch|tablet|\d+)\b/i,
    /\bAirPods\b/i,
    /\bheadsets?\b/i,
  ],

  BUSINESS: [
    /\bacquisitions?\b/i,
    /\bmergers?\b/i,
    /\bbankruptcy\b/i,
    /\blayoffs?\b/i,
    /\brestructuring\b/i,
    /\bfunding round\b/i,
    /\braises? \$\d/i,
    /\brevenue\b/i,
    /\bearnings\b/i,
    /\bIPO\b/i,
    /\bantitrust\b/i,
    /\bregulatory fine\b/i,
    /\bmarket valuation\b/i,
  ],

  PODCASTS: [/\bpodcasts?\b/i, /\baudio series\b/i, /\bpodcast episode\b/i],
};

const TECHNOLOGY_PATTERNS = [
  /\bsoftware\b/i,
  /\bdeveloper(?:s)?\b/i,
  /\bprogramming\b/i,
  /\bopen.source\b/i,
  /\bcloud computing\b/i,
  /\bcloud infrastructure\b/i,
  /\bAPI\b/,
  /\bSDK\b/,
  /\bframework\b/i,
  /\bdatabase\b/i,
  /\bdatacenter\b/i,
  /\bdata center\b/i,
  /\bkubernetes\b/i,
  /\bdocker\b/i,
  /\bgithub\b/i,
  /\bgitlab\b/i,
  /\btypescript\b/i,
  /\bjavascript\b/i,
  /\bpython\b/i,
  /\brust language\b/i,
  /\bjava\b/i,
  /\b\.NET\b/i,
  /\bcomputing\b/i,
  /\btech platform\b/i,
  /\bdigital infrastructure\b/i,
];

export function isTechnologyArticle(article: CollectedArticle): boolean {
  const content = `${article.title} ${article.description ?? ''}`;

  return TECHNOLOGY_PATTERNS.some((pattern) => pattern.test(content));
}

function scoreCategory(title: string, description: string, patterns: RegExp[]): number {
  const titleMatches = patterns.filter((pattern) => pattern.test(title)).length;

  const descriptionMatches = patterns.filter((pattern) => pattern.test(description)).length;

  return titleMatches * 3 + Math.min(descriptionMatches, 2);
}

export function classifyArticle(article: CollectedArticle): ClassifiedCategory | null {
  const description = article.description ?? '';

  const scores = Object.entries(RULES)
    .map(([category, patterns]) => ({
      category: category as Exclude<ClassifiedCategory, 'NEWS'>,
      score: scoreCategory(article.title, description, patterns),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scores[0];

  if (!best || best.score < 3) {
    return null;
  }

  return best.category;
}
