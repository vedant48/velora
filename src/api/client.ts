export const PROXY_URL = "https://proxy-api-server-f1an.onrender.com";

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Robust fetch wrapper with timeout, automatic retries with exponential backoff,
 * and standard abort signal support.
 */
export async function proxyGet<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeoutMs = 15000,
    retries = 2,
    retryDelayMs = 800,
    signal,
    headers = {},
    ...customConfig
  } = options;

  // Clean path to ensure exactly one leading slash
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${PROXY_URL}${cleanPath}`;

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // If external signal is aborted, abort our controller
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...headers,
        },
        signal: controller.signal,
        ...customConfig,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(
          `Request failed with status ${response.status}: ${response.statusText}`,
          response.status,
          endpoint
        );
      }

      const data = await response.json();
      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;

      // Do not retry if aborted by user
      if (signal?.aborted) {
        throw new ApiError('Request aborted by caller', 499, endpoint);
      }

      // Check if attempt can be retried
      attempt++;
      if (attempt <= retries) {
        const backoff = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw (
    lastError ||
    new ApiError(`Network request failed for ${endpoint}`, 500, endpoint)
  );
}
