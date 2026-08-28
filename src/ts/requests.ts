const DEFAULT_FETCH_TIMEOUT_MS = 60000;

async function fetchWithTimeout(
  input: string | URL | Request,
  init?: RequestInit,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const signal = init?.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)])
    : AbortSignal.timeout(timeoutMs);

  return fetch(input, {
    ...init,
    signal,
  });
}

export { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout };
