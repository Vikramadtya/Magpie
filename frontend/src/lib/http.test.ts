import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshSession, ServerUnreachable, tokenStore } from './http';

const fail = (status?: number) => Object.assign(new axios.AxiosError('x', undefined, undefined, undefined, status ? ({ status } as never) : undefined));

beforeEach(() => {
  vi.useFakeTimers();
  tokenStore.set(null);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('refreshSession', () => {
  it('returns the new token and keeps it in memory', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 'abc' } });
    expect(await refreshSession()).toBe('abc');
    expect(tokenStore.get()).toBe('abc');
  });

  it('says "signed out" at once when the server answers 401, without retrying', async () => {
    const post = vi.spyOn(axios, 'post').mockRejectedValue(fail(401));
    expect(await refreshSession()).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('waits out a sleeping server instead of signing the user out', async () => {
    const post = vi
      .spyOn(axios, 'post')
      .mockRejectedValueOnce(fail(502))
      .mockRejectedValueOnce(fail())
      .mockResolvedValue({ data: { accessToken: 'awake' } });
    const result = refreshSession();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await result).toBe('awake');
    expect(post).toHaveBeenCalledTimes(3);
  });

  it('shares one call between concurrent callers', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { accessToken: 't' } });
    await Promise.all([refreshSession(), refreshSession()]);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('gives up with ServerUnreachable, not "signed out", when the server never answers', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(fail(504));
    const result = refreshSession();
    const settled = expect(result).rejects.toBeInstanceOf(ServerUnreachable);
    await vi.advanceTimersByTimeAsync(200_000);
    await settled;
  });
});
