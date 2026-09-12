export function listNotices(notices) {
  const items = notices.filter((notice) => notice.published === true);
  return { items, total: items.length };
}
