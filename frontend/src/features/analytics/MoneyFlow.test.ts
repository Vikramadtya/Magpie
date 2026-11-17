import { describe, expect, it } from 'vitest';
import { flowData } from './MoneyFlow';

describe('flowData', () => {
  it('sends income through one pot to spending and to what was kept', () => {
    const f = flowData([{ label: 'Salary', value: 1000 }], [{ label: 'Rent', value: 400 }, { label: 'Food', value: 200 }]);
    expect(f.earned).toBe(1000);
    expect(f.spent).toBe(600);
    expect(f.nodes.map((n) => n.name)).toEqual(['Money in', 'Salary', 'Rent', 'Food', 'Kept']);
    const outOfPot = f.links.filter((l) => l.source === 0).reduce((a, l) => a + l.value, 0);
    const intoPot = f.links.filter((l) => l.target === 0).reduce((a, l) => a + l.value, 0);
    expect(outOfPot).toBe(1000); // what goes out equals what came in
    expect(intoPot).toBe(1000);
  });

  it('pays the difference from savings when more was spent than earned', () => {
    const f = flowData([{ label: 'Salary', value: 500 }], [{ label: 'Rent', value: 800 }]);
    expect(f.nodes.map((n) => n.name)).toContain('From savings');
    expect(f.nodes.map((n) => n.name)).not.toContain('Kept');
    const intoPot = f.links.filter((l) => l.target === 0).reduce((a, l) => a + l.value, 0);
    expect(intoPot).toBe(800);
  });
});
