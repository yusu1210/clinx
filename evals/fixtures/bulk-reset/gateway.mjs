export function gatewayError(code) {
  return Object.assign(new Error(code), { code });
}

export class PreferenceGateway {
  #settings;
  #receipts = new Map();
  applications = 0;

  constructor(accountIds) {
    this.#settings = new Map(
      accountIds.map((id) => [id, { deliveryOverride: '09:30', region: 'north' }]),
    );
  }

  read(id) {
    return structuredClone(this.#settings.get(id));
  }

  receipt(key) {
    return structuredClone(this.#receipts.get(key)?.result ?? null);
  }

  patchBatch(key, patches) {
    if (
      typeof key !== 'string' ||
      !key.trim() ||
      !Array.isArray(patches) ||
      patches.length < 1 ||
      patches.length > 16
    ) {
      throw gatewayError('INVALID');
    }
    const signature = JSON.stringify(patches);
    const previous = this.#receipts.get(key);
    if (previous) {
      if (previous.signature !== signature) throw gatewayError('INVALID');
      return structuredClone(previous.result);
    }
    for (const patch of patches) {
      if (!patch || !this.#settings.has(patch.accountId)) throw gatewayError('INVALID');
      if (
        Object.hasOwn(patch, 'deliveryOverride') &&
        patch.deliveryOverride !== null &&
        (typeof patch.deliveryOverride !== 'string' || !patch.deliveryOverride.trim())
      )
        throw gatewayError('INVALID');
      if (Object.keys(patch).some((key) => !['accountId', 'deliveryOverride'].includes(key)))
        throw gatewayError('INVALID');
    }
    for (const patch of patches) {
      if (Object.hasOwn(patch, 'deliveryOverride'))
        this.#settings.get(patch.accountId).deliveryOverride = patch.deliveryOverride;
    }
    this.applications++;
    const result = { key, applied: patches.map((patch) => patch.accountId) };
    this.#receipts.set(key, { signature, result });
    return structuredClone(result);
  }
}
