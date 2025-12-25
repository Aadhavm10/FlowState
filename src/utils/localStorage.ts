/**
 * LocalStorage helper with type safety and error handling
 */
export class LocalStorageHelper {
  constructor(private key: string) {}

  /**
   * Get value from localStorage with type safety
   */
  get<T>(defaultValue: T): T {
    try {
      const item = window.localStorage.getItem(this.key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error reading from localStorage (${this.key}):`, error);
      return defaultValue;
    }
  }

  /**
   * Set value in localStorage
   */
  set<T>(value: T): void {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage (${this.key}):`, error);
    }
  }

  /**
   * Remove value from localStorage
   */
  remove(): void {
    try {
      window.localStorage.removeItem(this.key);
    } catch (error) {
      console.error(`Error removing from localStorage (${this.key}):`, error);
    }
  }

  /**
   * Check if key exists
   */
  exists(): boolean {
    return window.localStorage.getItem(this.key) !== null;
  }
}
