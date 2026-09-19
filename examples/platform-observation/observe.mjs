// Original, synthetic provider contract. Adapt to a real platform's documented
// envelope, identities and terminal states; this is not a universal JSON validator.
export function assess(body, expected) {
  const result = (outcome, reason) => ({ outcome, reason });
  if (!body || body.ok !== true)
    return result('inconclusive', 'Provider did not return a successful business envelope');
  const job = body.job;
  if (!job || ['id', 'target', 'revision'].some((key) => job[key] !== expected[key]))
    return result('inconclusive', 'Operation, target or build identity does not match');
  if (job.state === 'failed') return result('fail', 'The identified operation failed');
  if (job.state !== 'succeeded')
    return result('inconclusive', 'The identified operation has no successful terminal result');
  if (!Array.isArray(job.cases) || job.cases.length === 0)
    return result('inconclusive', 'No executed cases');
  const ids = new Set();
  for (const entry of job.cases) {
    if (
      !entry ||
      typeof entry.id !== 'string' ||
      !entry.id.trim() ||
      ids.has(entry.id) ||
      !['passed', 'failed', 'skipped'].includes(entry.status)
    )
      return result('inconclusive', 'Malformed, duplicate or unknown case result');
    ids.add(entry.id);
  }
  if (job.cases.some((entry) => entry.status === 'failed'))
    return result('fail', 'A case failed despite the successful job envelope');
  if (
    expected.cases.some((id) => !ids.has(id)) ||
    job.cases.some((entry) => entry.status !== 'passed')
  )
    return result('inconclusive', 'Required cases are missing or cases were skipped');
  return result('pass', 'Identified terminal job and required executed cases passed');
}

export async function observe(url, expected) {
  if (
    !expected ||
    ['id', 'target', 'revision'].some(
      (k) => typeof expected[k] !== 'string' || !expected[k].trim(),
    ) ||
    !Array.isArray(expected.cases) ||
    expected.cases.length === 0 ||
    expected.cases.some((id) => typeof id !== 'string' || !id.trim()) ||
    new Set(expected.cases).size !== expected.cases.length
  )
    throw new Error('Expected operation, target, build and unique case identities are required');
  const request = new URL(url);
  // The shipped exercise only contacts its owned loopback fixture. A real provider
  // belongs in project tooling with its own access, credentials and endpoint policy.
  if (
    request.protocol !== 'http:' ||
    request.hostname !== '127.0.0.1' ||
    request.username ||
    request.password
  )
    throw new Error('This synthetic observer requires an owned loopback HTTP fixture');
  const observation = {
    observedAt: new Date().toISOString(),
    expected,
    status: null,
    raw: '',
    outcome: 'inconclusive',
    reason: '',
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(request, { signal: controller.signal, redirect: 'error' });
    observation.status = response.status;
    const parts = [];
    let length = 0;
    for await (const part of response.body) {
      length += part.length;
      if (length > 64 * 1024) {
        controller.abort();
        throw new Error('Response exceeds the 64 KiB observation limit');
      }
      parts.push(part);
    }
    observation.raw = Buffer.concat(parts).toString('utf8');
    if (!response.ok) observation.reason = 'HTTP request failed; terminal business result unknown';
    else {
      let body;
      try {
        body = JSON.parse(observation.raw);
      } catch {
        throw new Error('Malformed provider JSON');
      }
      Object.assign(observation, assess(body, expected));
    }
  } catch (error) {
    observation.reason = String(error);
  } finally {
    clearTimeout(timer);
    observation.observedAt = new Date().toISOString();
  }
  return observation;
}
