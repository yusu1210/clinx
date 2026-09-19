import { realpath } from 'node:fs/promises';
import { boundedPath } from './files.js';
import { manageSkill } from './install.js';
import {
  context,
  listTasks,
  taskPath,
  taskSummary,
  validatePageOptions,
  type PageOptions,
} from './task.js';
import { openWorkspace } from './workspace.js';
import { errorResult } from './output.js';
import { version } from './version.js';

// A read-only local snapshot, not host discovery, readiness, or an acceptance verdict.
export async function status(root: string, id?: string, page: PageOptions = {}) {
  validatePageOptions(page);
  root = await realpath(root);
  if (id !== undefined) taskPath(id);
  const issues: {
    component: string;
    message: string;
    hint: string;
    fields?: { path: string; message: string }[];
  }[] = [];
  const report = (component: string, error: unknown) => {
    const detail = errorResult(error, component === 'skills' ? 'skill status' : 'status');
    issues.push({
      component,
      message: detail.error,
      hint: detail.hint,
      ...('issues' in detail ? { fields: detail.issues } : {}),
    });
  };
  let skills: Awaited<ReturnType<typeof manageSkill>> | null = null;
  try {
    skills = await manageSkill(root, 'status');
  } catch (error) {
    report('skills', error);
  }
  let config: 'absent' | 'valid' | 'invalid' = 'absent';
  let workspace: Awaited<ReturnType<typeof openWorkspace>> | null = null;
  try {
    await boundedPath(root, 'clinx.config.json');
    config = 'invalid';
    workspace = await openWorkspace(root);
    config = 'valid';
  } catch (error) {
    if (config === 'invalid' || (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      config = 'invalid';
      report('configuration', error);
    }
  }
  let tasks: Awaited<ReturnType<typeof listTasks>>['tasks'] = [];
  let nextAfter: string | null = null;
  try {
    if (id !== undefined) tasks = [await taskSummary(root, id)];
    else ({ tasks, nextAfter } = await listTasks(root, page));
  } catch (error) {
    report('tasks', error);
  }
  let selected: Awaited<ReturnType<typeof context>> | null = null;
  if (id && workspace) {
    try {
      selected = await context(workspace, id);
    } catch (error) {
      report('task', error);
    }
  } else if (id) {
    issues.push({
      component: 'task',
      message: `Cannot assess continuity for ${id} without valid configuration`,
      hint: 'Read saved history with task show; use the Skill and current sources while records are unavailable.',
    });
  }
  return {
    version,
    root,
    skills,
    hostDiscovery: 'not-observed',
    configuration: { state: config, sources: workspace?.config.sources.map((s) => s.id) ?? [] },
    tasks,
    nextAfter,
    requestedTask: id ?? null,
    selected,
    issues,
    acceptance: 'not-assessed',
    next: id
      ? 'Read the selected handoff, current sources and issues before continuing; no operation was replayed.'
      : 'Give the agent your requirement; reuse known project context, or supply a missing project/knowledge anchor. Records are optional. To resume, resolve the intended task; no task is selected by recency.',
    limits:
      'Local snapshot only. Without a task ID, source contents are not fingerprinted. No host discovery, command execution, remote approval or delivery verdict is inferred. Exit zero means the snapshot was returned; inspect issues and per-task issues.',
  };
}
