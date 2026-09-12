import { mkdir, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import {
  configSchema,
  taskSchema,
  receiptSchema,
  checkpointSchema,
  checkpointInputSchema,
  evidenceSchema,
  evidenceInputSchema,
} from '../dist/schema.js';

await mkdir(new URL('../schemas/', import.meta.url), { recursive: true });
for (const [name, schema] of Object.entries({
  config: configSchema,
  task: taskSchema,
  receipt: receiptSchema,
  checkpoint: checkpointSchema,
  'checkpoint-input': checkpointInputSchema,
  evidence: evidenceSchema,
  'evidence-input': evidenceInputSchema,
})) {
  const json = z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input' });
  await writeFile(
    new URL(`../schemas/${name}.schema.json`, import.meta.url),
    JSON.stringify(json, null, 2) + '\n',
  );
}
