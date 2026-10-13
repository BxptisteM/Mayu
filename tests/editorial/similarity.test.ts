import { describe, expect, it } from 'vitest';

import { isSameEvent, titleSimilarity } from '../../src/editorial/similarity.js';

describe('Editorial event similarity', () => {
  it('detects related vulnerability headlines', () => {
    const first = 'Ivanti Connect Secure zero-day vulnerability exploited in attacks';

    const second = 'Hackers exploit Ivanti Connect Secure zero-day flaw';

    expect(isSameEvent(first, second)).toBe(true);
  });

  it('does not merge unrelated technology headlines', () => {
    const first = 'Microsoft releases a new Windows security update';

    const second = 'NVIDIA launches a new GPU architecture';

    expect(isSameEvent(first, second)).toBe(false);
  });

  it('returns zero similarity for empty titles', () => {
    expect(titleSimilarity('', '')).toBe(0);
  });
});
