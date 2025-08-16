import { formatTransactionAmount } from './currency';

describe('formatTransactionAmount', () => {
  it('formats positive whole numbers', () => {
    expect(formatTransactionAmount(1000)).toBe('₹1,000');
    expect(formatTransactionAmount(100000)).toBe('₹1,00,000');
  });

  it('formats positive decimals', () => {
    expect(formatTransactionAmount(1000.50)).toBe('₹1,000.50');
    expect(formatTransactionAmount(1000.5)).toBe('₹1,000.50');
  });

  it('formats negative amounts', () => {
    expect(formatTransactionAmount(-1000)).toBe('-(₹1,000)');
    expect(formatTransactionAmount(-1000.50)).toBe('-(₹1,000.50)');
  });

  it('handles edge cases', () => {
    expect(formatTransactionAmount(0)).toBe('₹0');
    expect(formatTransactionAmount(NaN)).toBe('₹0');
    expect(formatTransactionAmount(Infinity)).toBe('₹∞');
    expect(formatTransactionAmount(-Infinity)).toBe('-(₹∞)');
  });
});