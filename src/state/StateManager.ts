/**
 * Custom State Manager using Observer pattern
 *
 * This replaces the need for Svelte stores or other state management libraries
 * while keeping type safety and reactivity.
 */

type Listener<T> = (state: T) => void;
type Selector<T, R> = (state: T) => R;

export class StateManager<T> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();
  private selectorCache: Map<Selector<T, any>, any> = new Map();

  constructor(initialState: T) {
    this.state = initialState;
  }

  /**
   * Get current state (immutable)
   */
  getState(): Readonly<T> {
    return Object.freeze({ ...this.state });
  }

  /**
   * Subscribe to all state changes
   *
   * @param listener - Function called when state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    // Call immediately with current state
    listener(this.getState());
    // Return unsubscribe function
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to a specific slice of state
   * Only triggers when selected value changes
   *
   * @param selector - Function that extracts a slice of state
   * @param listener - Function called when selected value changes
   * @returns Unsubscribe function
   */
  selectSubscribe<R>(
    selector: Selector<T, R>,
    listener: (selected: R) => void
  ): () => void {
    let previousValue = selector(this.state);

    const wrappedListener = (state: T) => {
      const currentValue = selector(state);
      // Only notify if value changed (reference or deep equality)
      if (currentValue !== previousValue) {
        previousValue = currentValue;
        listener(currentValue);
      }
    };

    return this.subscribe(wrappedListener);
  }

  /**
   * Update state
   *
   * @param updater - Partial state or function that returns new state
   */
  setState(updater: Partial<T> | ((state: T) => T)): void {
    const newState = typeof updater === 'function'
      ? updater(this.state)
      : { ...this.state, ...updater };

    this.state = newState;
    this.selectorCache.clear();
    this.notify();
  }

  /**
   * Deep update for nested state
   * Useful for updating a specific key within the state
   *
   * @param key - Top-level key to update
   * @param value - Partial value to merge
   */
  updatePath<K extends keyof T>(key: K, value: Partial<T[K]>): void {
    this.setState({
      ...this.state,
      [key]: { ...this.state[key], ...value }
    } as T);
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    const frozenState = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(frozenState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * Get number of active listeners (for debugging)
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
}
