export class AsyncLocalStorage<T> {
  private store: T | undefined;

  getStore(): T | undefined {
    return this.store;
  }

  run<R>(store: T, callback: () => R): R {
    const previous = this.store;
    this.store = store;
    try {
      return callback();
    } finally {
      this.store = previous;
    }
  }

  enterWith(store: T): void {
    this.store = store;
  }

  exit<R>(callback: () => R): R {
    const previous = this.store;
    this.store = undefined;
    try {
      return callback();
    } finally {
      this.store = previous;
    }
  }

  disable(): void {
    this.store = undefined;
  }
}

export class AsyncResource {
  // biome-ignore lint/complexity/noUselessConstructor: matches the node:async_hooks signature
  constructor(
    _type: string,
    _options?: { triggerAsyncId?: number; requireManualDestroy?: boolean },
  ) {}
  runInAsyncScope<R>(fn: () => R): R {
    return fn();
  }
  emitDestroy(): void {}
  asyncId(): number {
    return 0;
  }
  triggerAsyncId(): number {
    return 0;
  }
  bind<F extends (...args: unknown[]) => unknown>(fn: F): F {
    return fn;
  }
  static bind<F extends (...args: unknown[]) => unknown>(fn: F): F {
    return fn;
  }
}

export function executionAsyncId(): number {
  return 0;
}

export function triggerAsyncId(): number {
  return 0;
}

export function createHook(): { enable(): void; disable(): void } {
  return { enable() {}, disable() {} };
}

export default {
  AsyncLocalStorage,
  AsyncResource,
  executionAsyncId,
  triggerAsyncId,
  createHook,
};
