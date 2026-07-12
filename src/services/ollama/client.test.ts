import { describe, expect, it } from 'vitest';
import { parseNdjsonLines } from './client';

describe('parseNdjsonLines', () => {
  it('parses complete NDJSON lines and returns leftover buffer', () => {
    const objects: unknown[] = [];
    const leftover = parseNdjsonLines(
      '{"message":{"content":"Hel"}}\n{"message":{"content":"lo"}}\n{"partial"',
      (obj) => objects.push(obj),
    );

    expect(objects).toEqual([
      { message: { content: 'Hel' } },
      { message: { content: 'lo' } },
    ]);
    expect(leftover).toBe('{"partial"');
  });

  it('skips malformed lines without throwing', () => {
    const objects: unknown[] = [];
    const leftover = parseNdjsonLines('not-json\n{"done":true}\n', (obj) => objects.push(obj));
    expect(objects).toEqual([{ done: true }]);
    expect(leftover).toBe('');
  });
});
