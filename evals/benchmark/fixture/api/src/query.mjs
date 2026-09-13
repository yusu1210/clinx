import { eligibleCampaigns, publicCampaign } from '../../policy/src/rules.mjs';

export function queryCampaigns({ tenant, region, page = 1, size = 20 }) {
  const eligible = eligibleCampaigns({ tenant, region });
  const start = (page - 1) * size;
  return {
    rows: eligible.slice(start, start + size).map(publicCampaign),
    total: eligible.length
  };
}
