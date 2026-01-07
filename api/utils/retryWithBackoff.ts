/**
 * Retry a function with exponential backoff on rate limit errors
 * Delays: 500ms, 1s, 2s, 4s, 8s
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 500
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error
      const isRateLimitError =
        error?.message?.includes('Too many requests') ||
        error?.status === 429 ||
        error?.error?.message?.includes('rate limit');

      if (isRateLimitError && attempt < maxRetries - 1) {
        // Exponential backoff: 500ms, 1s, 2s, 4s, 8s
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If not rate limit or max retries reached, throw
      throw error;
    }
  }

  throw lastError || new Error('Max retries reached');
}
