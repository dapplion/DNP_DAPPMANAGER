import async from "async";
import Logs from "../logs";
const logs = Logs(module);

/**
 * Makes sure the target async function is running only once at every instant.
 * It's similar to throttle, but instead of waiting an interval it waits for
 * completition. It uses the async.cargo function to achieve this behaviour.
 *
 *  Requests:       || | | ||| |                              |
 *  Function runs:  |--------------->|------------->|         |---------->|
 *
 *                  Multiple rapid calls are queued           Then it will wait
 *                  but the function will run one             for future calls
 *                  last time since there has been            and run when
 *                  a call after it started running           requested
 *
 * [NOTE]: The target function should NEVER be called with different arguments
 * since the arguments of non-first callers will be ignored.
 * [ONLY] use this function in recurring state checks, i.e. `natRenewal/index.ts`
 *
 * @param fn Target function
 */
export function runOnlyOneSequentially<A, R>(
  fn: (arg?: A) => Promise<R>
): (arg?: A) => void {
  // create a cargo object with an infinite payload
  const cargo = async.cargo(function(
    tasks: { arg: A }[],
    callback: () => void
  ) {
    fn(tasks[0].arg)
      .then(() => {
        callback();
      })
      .catch(e => {
        logs.error(
          `WARNING! functions in runOnlyOneSequentially MUST not throw, wrap them in try/catch blocks. Error: ${
            e.stack
          }`
        );
      });
  },
  1e9);

  return function(arg?: A): void {
    cargo.push({ arg });
  };
}

/**
 * Makes sure the target function is running only once at every instant.
 * When it's called multiple times it will only run once and return the
 * SAME result to all calls that happened within that run.
 *
 * Requests:       | ||| | || |                      |
 * Function runs:  |--------------->|                |------------>|
 *
 * [NOTE]: The target function should NEVER be called with different arguments
 * since the arguments of non-first callers will be ignored.
 * [ONLY] use this function to query a state that changes with a low frequency.
 * For example: to check if a blockchain node is syncing: `utils/isSyncing.ts`
 *
 * @param fn Target function (Callback style)
 */
export function runOnlyOneReturnToAll<R>(
  fn: () => Promise<R>
): () => Promise<R> {
  // This variables act as a class constructor
  let isRunning = false;
  let waitingPromises: {
    resolve: (res: R) => void;
    reject: (err: Error) => void;
  }[] = [];

  return function throttledFunction(): Promise<R> {
    return new Promise(
      (resolve, reject): void => {
        waitingPromises.push({ resolve, reject });
        if (!isRunning) {
          isRunning = true;
          fn()
            .then(
              res =>
                waitingPromises.forEach(waitingPromise => {
                  waitingPromise.resolve(res);
                }),
              (err: Error) =>
                waitingPromises.forEach(waitingPromise => {
                  waitingPromise.reject(err);
                })
            )
            .then(() => {
              isRunning = false;
              waitingPromises = [];
            });
        }
      }
    );
  };
}

export function runWithRetry<A, R>(
  apiMethod: (arg: A) => Promise<R>,
  params?: { times?: number; base?: number }
): (arg: A) => Promise<R> {
  const times = params && params.times ? params.times : 3;
  const base = params && params.base ? params.base : 225;

  return function retryFunction(arg: A): Promise<R> {
    return new Promise(
      (resolve, reject): void => {
        async.retry(
          {
            times,
            interval: (retryCount): number => base * Math.pow(2, retryCount)
          },
          async.asyncify(async () => apiMethod(arg)),
          (err: Error | null | undefined, result: R): void => {
            if (err) reject(err);
            else resolve(result);
          }
        );
      }
    );
  };
}

/**
 * Waits `ms` miliseconds
 *
 * @param ms Pause time (ms)
 */
export function pause(ms: number): Promise<void> {
  return new Promise(
    (resolve): void => {
      setTimeout(resolve, ms);
    }
  );
}
