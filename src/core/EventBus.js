class EventEmitter {
  constructor() {
    this.listeners = new Map();
  }

  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(listener);
    return () => this.off(event, listener);
  }

  off(event, listener) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (!listeners.size) {
        this.listeners.delete(event);
      }
    }
  }

  emit(event, ...args) {
    const listeners = this.listeners.get(event);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      listener(...args);
    }
  }
}

export const eventBus = new EventEmitter();
export { EventEmitter };
