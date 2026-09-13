export async function notices(url) {
  const response = await fetch(new URL('/notices', url), { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error(`Notice request failed: ${response.status}`);
  const data = await response.json();
  return { titles: data.items.map((item) => item.title), total: data.total };
}
