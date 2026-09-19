import { randomUUID } from 'node:crypto';
import { opendir, realpath } from 'node:fs/promises';
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
import { evidenceStore, validateEvidenceRecord } from './evidence-store.js';
import {
  openWorkspace,
  fingerprintSources,
  definitionDigest,
  resolveFileRef,
  taskSources,
  type Workspace,
} from './workspace.js';
import { readTask } from './task.js';
import { evidenceInputSchema, evidenceSchema, unique, type Evidence } from './schema.js';

const maxTotalBytes = 16 * 1024 * 1024;
const note =
  'Attachments retain an observer assertion, not a verified verdict or authority. Local bindings describe capture-time inputs, not necessarily the observed deployment. Remote state and target revision are not verified; review all relevant pass/fail/inconclusive observations alongside verify.';
async function binding(p: Workspace, id: string) {
  const { task, taskDigest } = await readTask(p, id);
  return {
    definitionDigest: definitionDigest(p, task),
    taskDigest,
    sources: (await fingerprintSources(p, task)).map(({ id, digest }) => ({ id, digest })),
  };
}

export async function addEvidence(p: Workspace, id: string, value: unknown) {
  const input = evidenceInputSchema.parse(value);
  unique(input.obligations, 'evidence obligation IDs');
  unique(
    input.artifacts.map((a) => JSON.stringify([a.source ?? null, a.path])),
    'evidence artifact references',
  );
  if (Date.parse(input.observedAt) > Date.now()) throw new Error('Observation is in the future');
  return withLock(p.root, async () => {
    const current = await openWorkspace(p.root);
    const { task } = await readTask(current, id);
    if (!task.obligations?.length)
      throw new Error(
        'Task has no verification plan. Evidence attachments must reference declared obligations; use task revise to add a plan before attaching evidence.',
      );
    for (const obligation of input.obligations)
      if (!(task.obligations ?? []).some((o) => o.id === obligation))
        throw new Error(`Unknown evidence obligation: ${obligation}`);
    const capturedInputs = await binding(current, id);
    let total = 0;
    const copies = [];
    for (const [index, artifact] of input.artifacts.entries()) {
      if (artifact.source && !taskSources(current, task).some((s) => s.id === artifact.source))
        throw new Error(`Evidence source outside task sources: ${artifact.source}`);
      const bytes = await readBounded(await resolveFileRef(current, artifact));
      total += bytes.length;
      if (bytes.length === 0 || total > maxTotalBytes)
        throw new Error('Evidence requires nonempty artifacts with at most 16 MiB total');
      const extension = extname(artifact.path);
      copies.push({
        bytes,
        entry: {
          path: `artifacts/${index}${/^\.[a-zA-Z0-9]{1,12}$/.test(extension) ? extension : '.bin'}`,
          original: {
            ...(artifact.source ? { source: artifact.source } : {}),
            path: artifact.path,
          },
          description: artifact.description,
          bytes: bytes.length,
          sha256: sha256(bytes),
        },
      });
    }
    if (canonical(capturedInputs) !== canonical(await binding(await openWorkspace(p.root), id)))
      throw new Error('Inputs changed during evidence capture; inspect and retry');
    const { artifacts: _paths, ...observation } = input;
    const record = evidenceSchema.parse({
      version: 2,
      id: randomUUID(),
      taskId: id,
      createdAt: new Date().toISOString(),
      trust: 'local-attachment-not-attested',
      capturedInputs,
      observation,
      artifacts: copies.map((c) => c.entry),
    });
    const directory = `${evidenceStore(id)}/${record.id}`;
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

export async function listEvidence(root: string, id: string, recordId?: string) {
  root = await realpath(root);
  // Archive integrity does not depend on today's configuration or task contract.
  const location = evidenceStore(id);
  const names: string[] = [];
  try {
    if (recordId !== undefined) names.push(evidenceSchema.shape.id.parse(recordId));
    else {
      const directory = await opendir(await boundedPath(root, location));
      for await (const entry of directory) {
        if (names.length === 1024)
          throw new Error('More than 1024 evidence records; select a saved UUID with --record');
        names.push(entry.name);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return { taskId: id, records: [], note };
    throw error;
  }
  let current: Evidence['capturedInputs'] | undefined;
  let bindingError: string | undefined;
  try {
    current = await binding(await openWorkspace(root), id);
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
      const directory = await boundedPath(root, `${location}/${name}`);
      const record = evidenceSchema.parse(
        await readJson(await boundedPath(directory, 'record.json')),
      );
      validateEvidenceRecord(record, id, name);
      // Preserve valid metadata even when an artifact is missing, changed or beyond
      // the aggregate listing budget. Integrity is a separate assessment.
      entry.record = record;
      if (current) {
        entry.localBinding =
          canonical(current) === canonical(record.capturedInputs) ? 'matches' : 'changed';
        if (entry.localBinding === 'changed')
          entry.reasons.push(
            'Local config, contract/design or declared sources changed since capture',
          );
      } else entry.reasons.push(`Cannot establish current local inputs: ${bindingError}`);
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
      entry.integrity = 'intact';
    } catch (error) {
      entry.reasons.push(String(error));
    }
    records.push(entry);
  }
  return { taskId: id, records, note };
}
