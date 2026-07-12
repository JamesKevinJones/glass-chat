import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetMemoryAuthForTests, useAuthStore } from './useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    resetMemoryAuthForTests();
    useAuthStore.setState({
      user: null,
      status: 'anonymous',
      error: null,
    });
  });

  it('registers and keeps a local session in memory mode', async () => {
    const { result } = renderHook(() => useAuthStore());

    let ok = false;
    await act(async () => {
      ok = await result.current.register('aura_user', 'secret1');
    });

    expect(ok).toBe(true);
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.username).toBe('aura_user');
  });

  it('rejects duplicate usernames', async () => {
    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.register('twin', 'secret1');
      await result.current.logout();
    });

    let ok = true;
    await act(async () => {
      ok = await result.current.register('twin', 'secret1');
    });

    expect(ok).toBe(false);
    await waitFor(() => {
      expect(result.current.error).toMatch(/taken/i);
    });
  });
});
