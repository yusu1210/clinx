import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { observe } from './observe.mjs';
import { provider, expected, success } from './provider.mjs';

const pending = success();
pending.job.state = 'running';
const failed = success();
failed.job.state = 'failed';
const fixture = await provider([{ body: pending }, { body: failed }, { body: success() }]);
try {
  const directory = join(import.meta.dirname, '.clinx', 'inbox');
  await mkdir(directory, { recursive: true });
  // Three distinct reads, not automatic resubmission or a claim that failed jobs
  // recover this way on a real platform. This script demonstrates retained history.
  for (const label of ['pending', 'failed', 'passed']) {
    const observation = await observe(fixture.url, expected);
    const path = `${label}-${Date.now()}.json`;
    await writeFile(join(directory, path), JSON.stringify(observation, null, 2) + '\n', {
      flag: 'wx',
    });
    const attachment = {
      obligations: ['target-behavior'],
      observedAt: observation.observedAt,
      observer: 'synthetic loopback observer',
      method: 'tool',
      target: { identity: fixture.url, revision: 'synthetic build-7; no deployment observed' },
      outcome: observation.outcome,
      summary: observation.reason,
      artifacts: [
        {
          path: `.clinx/inbox/${path}`,
          description: 'Actual loopback response and interpretation',
        },
      ],
      limitations: [
        'Synthetic provider responses; no production job or product behavior was exercised',
      ],
    };
    const input = join(directory, `attach-${path}`);
    await writeFile(input, JSON.stringify(attachment, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ outcome: observation.outcome, attachment: input }));
  }
} finally {
  await fixture.close();
}
