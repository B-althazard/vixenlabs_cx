import { describe, expect, it, vi } from 'vitest';
import {
  createRuntimeUpdateState,
  createVersionedRuntimeUrl
} from '../src/lib/runtimeFreshness.js';

describe('runtime freshness helpers', () => {
  it('adds the active build version to runtime asset requests', () => {
    expect(createVersionedRuntimeUrl('/schema/index.json', 'release-42')).toBe(
      '/vixenlabs_cx/schema/index.json?v=release-42'
    );
  });

  it('creates a refresh-ready runtime update notice', () => {
    const applyUpdate = vi.fn();

    expect(createRuntimeUpdateState(applyUpdate)).toEqual({
      runtimeUpdateAvailable: true,
      runtimeUpdateMessage: 'A new release is ready. Refresh to load the latest schema, models, and presets.',
      applyRuntimeUpdate: applyUpdate
    });
  });
});
