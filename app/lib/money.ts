/** French price format: "65 €", "34,90 €" (no decimals when round). */
export function formatPrice(money: {amount: string; currencyCode: string}) {
  const value = Number(money.amount);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}
