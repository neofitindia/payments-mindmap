export const formatTransactionAmount = (amount: number): string => {
  // Handle edge cases
  if (!Number.isFinite(amount)) {
    if (Number.isNaN(amount)) {
      return '₹0';
    }
    if (amount === Infinity) {
      return '₹∞';
    }
    if (amount === -Infinity) {
      return '-(₹∞)';
    }
  }

  // Format number with commas using Indian numbering system
  const isWholeNumber = Math.abs(amount) % 1 === 0;
  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: isWholeNumber ? 0 : 2,
    maximumFractionDigits: 2
  });

  // Format negative amounts as "-(₹44,000)"
  if (amount < 0) {
    return `-(₹${formatter.format(Math.abs(amount))})`;
  }

  return `₹${formatter.format(amount)}`;
};
