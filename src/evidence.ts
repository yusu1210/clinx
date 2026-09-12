import { randomUUID } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  boundedPath,
  canonical,
  makePrivateDir,
  readBounded,
  readJson,
  sha256,
  withLock,
  writeNew,
} from './files.js';
import { project, readTask, fingerprintSources, taskPath, type Project } from './project.js';
import { evidenceInputSchema, evidenceSchema, unique, type Evidence } from './schema.js';

const maxTotalBytes = 16 * 1024 * 1024;
const store = (id: string) => {
  taskPath(id); // Validate identity before using it as a path component.
  return `.clinx/evidence/${id}`;
};
const note =
  'Attachments retain an observer assertion, not a verified verdict or authority. Local bindings describe capture-time inputs, not necessarily the observed deployment. Remote state and target revision are not verified; review all relevant pass/fail/inconclusive observations alongside verify.';
async function binding(p: Project, id: string) {
  const { taskDigest } = await readTask(p, id);
  return {
    configDigest: p.configDigest,
    taskDigest,
    sources: (await fingerprintSources(p)).map(({ id, digest }) => ({ id, digest })),
  };
}

export async function addEvidence(p: Project, id: string, value: unknown) {
  const input = evidenceInputSchema.parse(value);
  unique(input.obligations, 'evidence obligation IDs');
  unique(
    input.artifacts.map((a) => a.path),
    'evidence artifact paths',
  );
  if (Date.parse(input.observedAt) > Date.now()) throw new Error('Observation is in the future');
  return withLock(p.root, async () => {
    const current = await project(p.root);
    const { task } = await readTask(current, id);
    for (const obligation of input.obligations)
      if (!task.obligations.some((o) => o.id === obligation))
        throw new Error(`Unknown evidence obligation: ${obligation}`);
    const capturedInputs = await binding(current, id);
    let total = 0;
    const copies = [];
    for (const [index, artifact] of input.artifacts.entries()) {
      const bytes = await readBounded(await boundedPath(current.root, artifact.path));
      total += bytes.length;
      if (bytes.length === 0 || total > maxTotalBytes)
        throw new Error('Evidence requires nonempty artifacts with at most 16 MiB total');
      const extension = extname(artifact.path);
      copies.push({
        bytes,
        entry: {
          path: `artifacts/${index}${/^\.[a-zA-Z0-9]{1,12}$/.test(extension) ? extension : '.bin'}`,
          originalPath: artifact.path,
          description: artifact.description,
          bytes: bytes.length,
          sha256: sha256(bytes),
        },
      });
    }
    if (canonical(capturedInputs) !== canonical(await binding(await project(p.root), id)))
      throw new Error('Inputs changed during evidence capture; inspect and retry');
    const { artifacts: _paths, ...observation } = input;
    const record = evidenceSchema.parse({
      version: 1,
      id: randomUUID(),
      taskId: id,
      createdAt: new Date().toISOString(),
      trust: 'local-attachment-not-attested',
      capturedInputs,
      observation,
      artifacts: copies.map((c) => c.entry),
    });
    const directory = `${store(id)}/${record.id}`;
    await makePrivateDir(current.root, `${directory}/artifacts`);
    for (const copy of copies)
      await writeNew(
        await boundedPath(current.root, `${directory}/${copy.entry.path}`, true),
        copy.bytes,
      );
    const path = `${directory}/record.json`;
    // Publish metadata last. An interrupted capture is an invalid record, never success.
    await writeNew(
      await boundedPath(current.root, path, true),
      `${JSON.stringify(record, null, 2)}\n`,
    );
    return { path, record, note };
  });
}

interface ListedEvidence {
  path: string;
  record: Evidence | null;
  integrity: 'intact' | 'invalid' | 'not-checked';
  localBinding: 'matches' | 'changed' | 'unknown';
  remoteState: 'not-checked';
  reasons: string[];
}

export async function listEvidence(p: Project, id: string, recordId?: string) {
  p = await project(p.root);
  // A stale design reference can make the binding unreadable; retain access to history.
  const location = store(id);
  await boundedPath(p.root, `${taskPath(id)}/contract.json`);
  let names: string[];
  try {
    names = recordId
      ? [evidenceSchema.shape.id.parse(recordId)]
      : await readdir(await boundedPath(p.root, location));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { taskId: id, records: [], note };
    throw error;
  }
  if (names.length > 1024)
    throw new Error('More than 1024 evidence records; select a saved UUID with --record');
  let current: Evidence['capturedInputs'] | undefined;
  let bindingError: string | undefined;
  try {
    current = await binding(p, id);
  } catch (error) {
    bindingError = String(error);
  }
  const records: ListedEvidence[] = [];
  let remainingBytes = 128 * 1024 * 1024;
  for (const name of names.sort()) {
    const entry: ListedEvidence = {
      path: `${location}/${name}/record.json`,
      record: null,
      integrity: 'invalid',
      localBinding: 'unknown',
      remoteState: 'not-checked',
      reasons: [],
    };
    try {
      if (!/^[a-f0-9-]{36}$/.test(name)) throw new Error('Unexpected evidence directory identity');
      const directory = await boundedPath(p.root, `${location}/${name}`);
      const record = evidenceSchema.parse(
        await readJson(await boundedPath(directory, 'record.json')),
      );
      if (record.id !== name || record.taskId !== id) throw new Error('Evidence identity mismatch');
      unique(record.observation.obligations, 'evidence obligation IDs');
      unique(
        record.artifacts.map((a) => a.path),
        'stored artifact paths',
      );
      unique(
        record.capturedInputs.sources.map((s) => s.id),
        'captured source IDs',
      );
      if (Date.parse(record.observation.observedAt) > Date.parse(record.createdAt))
        throw new Error('Observation postdates capture');
      let total = 0;
      for (const artifact of record.artifacts) {
        if (artifact.bytes > remainingBytes) {
          entry.integrity = 'not-checked';
          throw new Error('Listing byte budget exhausted; inspect this saved UUID with --record');
        }
        const bytes = await readBounded(
          await boundedPath(directory, artifact.path),
          artifact.bytes,
        );
        remainingBytes -= bytes.length;
        total += bytes.length;
        if (
          bytes.length !== artifact.bytes ||
          sha256(bytes) !== artifact.sha256 ||
          total > maxTotalBytes
        )
          throw new Error(`Artifact integrity mismatch: ${artifact.path}`);
      }
      entry.record = record;
      entry.integrity = 'intact';
      if (current) {
        entry.localBinding =
          canonical(current) === canonical(record.capturedInputs) ? 'matches' : 'changed';
        if (entry.localBinding === 'changed')
          entry.reasons.push(
            'Local config, contract/design or declared sources changed since capture',
          );
      } else entry.reasons.push(`Cannot establish current local inputs: ${bindingError}`);
    } catch (error) {
      entry.reasons.push(String(error));
    }
    records.push(entry);
  }
  return { taskId: id, records, note };
}
