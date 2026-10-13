import type { Category } from '../sources/categories.js';

export interface EditorialCandidate {
  id: string;
  title: string;
  description: string | null;
  url: string;
  publishedAt: Date;
  sourceId: string | null;
  sourceName: string;
  category: Category;
}

export interface RankedArticle extends EditorialCandidate {
  score: number;
}
