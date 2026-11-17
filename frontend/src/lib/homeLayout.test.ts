import { describe, expect, it } from 'vitest';
import { applyLayout } from './homeLayout';

const DEFAULT = ['summary', 'attention', 'month', 'breakdown', 'activity'];

describe('applyLayout', () => {
  it('shows everything in the default order when nothing was saved', () => {
    expect(applyLayout(DEFAULT, null)).toEqual({ visible: DEFAULT, hidden: [] });
  });
  it('follows the saved order and hides what was hidden', () => {
    const r = applyLayout(DEFAULT, { order: ['activity', 'summary', 'attention', 'month', 'breakdown'], hidden: ['month'] });
    expect(r.visible).toEqual(['activity', 'summary', 'attention', 'breakdown']);
    expect(r.hidden).toEqual(['month']);
  });
  it('adds sections that are new since it was saved and drops ones that are gone', () => {
    const r = applyLayout(DEFAULT, { order: ['gone', 'month', 'summary'], hidden: ['gone', 'attention'] });
    expect(r.visible).toEqual(['month', 'summary', 'breakdown', 'activity']); // new ones land at the end
    expect(r.hidden).toEqual(['attention']);
  });
});
