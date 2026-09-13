export function campaignUrl(baseUrl, { page = 1, size = 20 } = {}) {
  const url = new URL('/campaigns', baseUrl);
  url.searchParams.set('page', String(page));
  url.searchParams.set('size', String(size));
  return url;
}

export async function loadCampaigns(
  baseUrl,
  { tenant, region, page = 1, size = 20 } = {},
  fetchImpl = fetch,
) {
  return fetchImpl(campaignUrl(baseUrl, { page, size }), {
    headers: { 'x-tenant': tenant, 'x-region': region },
  });
}
