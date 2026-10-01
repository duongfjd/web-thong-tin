import { describe, it, expect } from 'vitest';
import { parseQuickExpense } from './logic';

describe('parseQuickExpense', () => {
  it('parses "cafe 35k"', () => {
    expect(parseQuickExpense('cafe 35k')).toEqual({ amount: 35000, note: 'cafe' });
  });

  it('parses "35k cafe"', () => {
    expect(parseQuickExpense('35k cafe')).toEqual({ amount: 35000, note: 'cafe' });
  });

  it('parses "xang 1tr"', () => {
    expect(parseQuickExpense('xang 1tr')).toEqual({ amount: 1000000, note: 'xang' });
  });

  it('parses "dien 1.5tr"', () => {
    expect(parseQuickExpense('dien 1.5tr')).toEqual({ amount: 1500000, note: 'dien' });
  });
  
  it('parses "an trua 50.5k"', () => {
    expect(parseQuickExpense('an trua 50.5k')).toEqual({ amount: 50500, note: 'an trua' });
  });

  it('parses "cafe 35"', () => {
    expect(parseQuickExpense('cafe 35')).toEqual({ amount: 35000, note: 'cafe' });
  });

  it('parses "an trua 50000"', () => {
    expect(parseQuickExpense('an trua 50000')).toEqual({ amount: 50000, note: 'an trua' });
  });

  it('returns null on invalid input', () => {
    expect(parseQuickExpense('just some text')).toBeNull();
  });
});
