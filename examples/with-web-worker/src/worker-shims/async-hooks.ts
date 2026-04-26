import { context } from "@opentelemetry/api";
import type { Context, ContextManager } from "@opentelemetry/api";

class WorkerNoopContextManager implements ContextManager {
  private currentContext = context.active();

  active(): Context {
    return this.currentContext;
  }

  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    ctx: Context,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    const previous = this.currentContext;
    this.currentContext = ctx;
    try {
      return fn.call(thisArg as ThisParameterType<F>, ...args);
    } finally {
      this.currentContext = previous;
    }
  }

  bind<T>(_ctx: Context, target: T): T {
    return target;
  }

  enable(): this {
    return this;
  }

  disable(): this {
    return this;
  }
}

export class AsyncHooksContextManager extends WorkerNoopContextManager {}
export class AsyncLocalStorageContextManager extends WorkerNoopContextManager {}
