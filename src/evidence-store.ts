import { opendir } from 'node:fs/promises';
import { boundedPath, readBounded } from './files.js';
import { evidenceSchema, unique, type Evidence, type EvidenceIndex } from './schema.js';

export function evidenceStore(id: string): string {
  evidenceSchema.shape.taskId.parse(id);
  return `.clinx/evidence/${id}`;
}

export function validateEvidenceRecord(record: Evidence, id: string, name: string) {
  if (record.id !== name || record.taskId !== id) throw new Error('Evidence identity mismatch');
  unique(record.observation.obligations, 'evidence obligation IDs');
  unique(
    record.artifacts.map((artifact) => artifact.path),
    'stored artifact paths',
  );
  unique(
    record.capturedInputs.sources.map((source) => source.id),
    'captured source IDs',
  );
  unique(
    record.artifacts.map((artifact) =>
      JSON.stringify([artifact.original.source ?? null, artifact.original.path]),
    ),
    'stored artifact references',
  );
  for (const artifact of record.artifacts)
    if (
      artifact.original.source &&
      !record.capturedInputs.sources.some((source) => source.id === artifact.original.source)
    )
      throw new Error(`Artifact origin outside captured sources: ${artifact.original.source}`);
  if (Date.parse(record.observation.observedAt) > Date.parse(record.createdAt))
    throw new Error('Observation postdates capture');
  return record;
}

export async function evidenceIndex(root: string, id: string): Promise<EvidenceIndex> {
  const location = evidenceStore(id);
  const index: EvidenceIndex = {
    records: [],
    issues: [],
    truncated: false,
    integrity: 'not-checked',
    localBinding: 'not-checked',
    remoteState: 'not-checked',
    instruction:
      'Saved observer assertions only; no newest-pass selection. Inspect relevant records with evidence list ID --record UUID before reuse. Metadata discovery is bounded, is not a snapshot and does not assess acceptance.',
  };
  let remaining = 256 * 1024;
  let count = 0;
  try {
    const directory = await opendir(await boundedPath(root, location));
    for await (const entry of directory) {
      if (count++ === 64 || remaining === 0) {
        index.truncated = true;
        break;
      }
      const path = `${location}/${entry.name}/record.json`;
      try {
        evidenceSchema.shape.id.parse(entry.name);
        const bytes = await readBounded(
          await boundedPath(root, path),
          Math.min(64 * 1024, remaining),
        );
        remaining -= bytes.length;
        // Do not expose fragments of malformed JSON (which might contain secrets).
        let value: unknown;
        try {
          value = JSON.parse(bytes.toString('utf8'));
        } catch {
          throw new Error('Invalid evidence JSON; inspect the saved record locally');
        }
        const record = validateEvidenceRecord(evidenceSchema.parse(value), id, entry.name);
        index.records.push({ id: record.id, path, observation: record.observation });
      } catch (error) {
        index.issues.push({ path, error: String(error) });
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
      index.issues.push({ path: location, error: String(error) });
  }
  index.records.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return index;
}
