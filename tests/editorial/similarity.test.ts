import { describe, expect, it } from 'vitest';

import { isSameEvent, titleSimilarity } from '../../src/editorial/similarity.js';

describe('Editorial event similarity', () => {
  it('detects related vulnerability headlines', () => {
    const first = 'Ivanti Connect Secure zero-day vulnerability exploited in attacks';

    const second = 'Hackers exploit Ivanti Connect Secure zero-day flaw';

    expect(isSameEvent(first, second)).toBe(true);
  });

  it('groups different coverage of the Ivanti zero-day chain', () => {
    const first =
      'Volexity Uncovers Stealthy Ivanti VPN Attack Using Three Zero-Day Vulnerabilities';

    const second = 'Ivanti Zero-Day Chain Gave Attackers Root Access to Fully Patched VPN';

    expect(isSameEvent(first, second)).toBe(true);
  });

  it('does not merge different CVEs', () => {
    const first = 'Ivanti zero-day vulnerability CVE-2026-12345 exploited';

    const second = 'Ivanti zero-day vulnerability CVE-2026-67890 exploited';

    expect(isSameEvent(first, second)).toBe(false);
  });

  it('does not merge unrelated security vendors', () => {
    const first = 'Ivanti zero-day vulnerability exploited in attacks';

    const second = 'Microsoft zero-day vulnerability exploited in attacks';

    expect(isSameEvent(first, second)).toBe(false);
  });

  it('does not merge unrelated technology headlines', () => {
    const first = 'Microsoft releases a new Windows security update';

    const second = 'NVIDIA launches a new GPU architecture';

    expect(isSameEvent(first, second)).toBe(false);
  });

  it('does not merge unrelated announcements from the same vendor', () => {
    const first = 'Microsoft announces a new Surface laptop';

    const second = 'Microsoft launches Azure cloud storage features';

    expect(isSameEvent(first, second)).toBe(false);
  });

  it('returns zero similarity for empty titles', () => {
    expect(titleSimilarity('', '')).toBe(0);
  });

  it('does not merge unrelated vulnerabilities with similar wording', () => {
    expect(
      isSameEvent(
        'Ivanti zero-day vulnerability exploited in attacks',
        'Microsoft zero-day vulnerability exploited in attacks',
      ),
    ).toBe(false);
  });
});
