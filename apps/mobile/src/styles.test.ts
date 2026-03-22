import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('shell layout CSS', () => {
  it('does not depend on visual viewport offset variables for shell width', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

    expect(css).not.toContain('--app-viewport-width');
    expect(css).not.toContain('--app-viewport-offset-left');
    expect(css).not.toContain('left: calc(');
    expect(css).toContain('max-width: 1280px;');
    expect(css).toContain('box-sizing: border-box;');
    expect(css).not.toMatch(/box-sizing:\s*inherit/);
  });
});
