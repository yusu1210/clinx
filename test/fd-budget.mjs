import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';

// Measure application-owned handles after module loading. The ESM loader uses
// internal fs bindings; its startup demand is a separate runtime constraint.
export async function withFdBudget(t, limit, action) {
  let active = 0;
  let peak = 0;
  const acquire = () => {
    if (active >= limit) throw Object.assign(new Error('Injected FD limit'), { code: 'EMFILE' });
    peak = Math.max(peak, ++active);
  };
  const open = fs.open;
  const opendir = fs.opendir;
  const mocks = [
    t.mock.method(fs, 'open', async (...args) => {
      acquire();
      let handle;
      try {
        handle = await open(...args);
      } catch (error) {
        active--;
        throw error;
      }
      const close = handle.close.bind(handle);
      handle.close = async () => {
        try {
          await close();
        } finally {
          active--;
        }
      };
      return handle;
    }),
    t.mock.method(fs, 'opendir', async (...args) => {
      acquire();
      let directory;
      try {
        directory = await opendir(...args);
      } catch (error) {
        active--;
        throw error;
      }
      return {
        async *[Symbol.asyncIterator]() {
          try {
            yield* directory;
          } finally {
            active--;
          }
        },
      };
    }),
  ];
  syncBuiltinESMExports();
  try {
    const result = await action();
    assert.equal(active, 0, 'application handles must close before return');
    return { result, peak };
  } finally {
    mocks.forEach((mock) => mock.mock.restore());
    syncBuiltinESMExports();
  }
}
