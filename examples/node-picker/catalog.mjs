// Synthetic domain model. One owner for eligibility; rows and totals use the same set.
export function eligible(item, tenant) {
  return item.tenant === tenant && item.active === true && item.stock > 0;
}
export function query(items, { tenant, offset = 0, limit = 20 }) {
  if (
    !tenant ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new RangeError('Invalid selection');
  }
  const matching = items
    .filter((item) => eligible(item, tenant))
    .sort((a, b) => a.id.localeCompare(b.id));
  return { rows: matching.slice(offset, offset + limit), total: matching.length };
}
