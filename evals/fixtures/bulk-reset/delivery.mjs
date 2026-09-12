export const BATCH_SIZE = 16;
export const MAX_BATCHES = 3;

export function planBatches(items) {
  if (!Array.isArray(items) || items.length > BATCH_SIZE * MAX_BATCHES) {
    throw new RangeError('Operation exceeds the declared batch budget');
  }
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) batches.push(items.slice(i, i + BATCH_SIZE));
  return batches;
}

export async function sendBatch(client, key, patches) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await client.patchBatch(key, patches);
    } catch (error) {
      if (error.code === 'UNKNOWN') {
        const receipt = await client.receipt(key);
        if (receipt !== null) return receipt;
      } else if (error.code !== 'RETRYABLE') {
        throw error;
      }
      if (attempt === 1) throw error;
    }
  }
}
