import { describe, expect, it } from 'vitest';
import { isSameEvent, titleSimilarity, tokenizeTitle } from '../../src/editorial/similarity.js';
describe('Title normalization and event identifiers', () => {
  it('normalizes accents and case while removing stop words and repeated tokens', () => {
    expect(tokenizeTitle('The CAFÉ launches café API')).toEqual(new Set(['cafe', 'api']));
  });
  it('calculates token intersection over union', () => {
    expect(titleSimilarity('alpha beta', 'beta gamma')).toBeCloseTo(1 / 3);
  });
  it('matches equivalent CVE identifiers regardless of case', () => {
    expect(
      isSameEvent('Ivanti critical CVE-2026-12345 vulnerability', 'Ivanti flaw cve-2026-12345'),
    ).toBe(true);
  });
  it('does not confuse generic vocabulary with a shared security subject', () => {
    expect(
      isSameEvent(
        'Acme security flaw remote code execution',
        'Contoso security flaw remote code execution',
      ),
    ).toBe(false);
  });
  it('does not match stop-word-only titles', () => {
    expect(isSameEvent('the and for', 'the and for')).toBe(false);
  });
});
