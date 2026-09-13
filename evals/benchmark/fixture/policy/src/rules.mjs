const campaigns = [
  { id: 'c1', tenant: 'tenant-a', tier: 'gold', active: true,  budget: 100, regions: ['sg', 'us'] },
  { id: 'c2', tenant: 'tenant-a', tier: 'silver', active: true, budget: 80,  regions: ['sg'] },
  { id: 'c3', tenant: 'tenant-a', tier: 'gold', active: true,  budget: 0,   regions: ['sg'] },
  { id: 'c4', tenant: 'tenant-a', tier: 'gold', active: false, budget: 90,  regions: ['sg'] },
  { id: 'c5', tenant: 'tenant-b', tier: 'gold', active: true,  budget: 90,  regions: ['sg'] },
  { id: 'c6', tenant: 'tenant-a', tier: 'silver', active: true, budget: 70, regions: ['us'] },
  { id: 'c7', tenant: 'tenant-a', tier: 'gold', active: true,  budget: 60,  regions: ['sg', 'us'] }
];

export function eligibleCampaigns({ tenant, region }) {
  return campaigns.filter(
    (campaign) =>
      campaign.tenant === tenant &&
      campaign.active &&
      campaign.budget > 0 &&
      campaign.regions.includes(region) &&
      campaign.id !== process.env.POLICY_BLOCK_ID
  );
}

export function publicCampaign(campaign) {
  return { id: campaign.id, tier: campaign.tier };
}
