import { setTimeout, type Timeout } from 'safe-timers';

type PromiseGeneratingFunction<t> = () => PromiseLike<t>;

export class TimeoutError extends Error {
    constructor(message: string) {
        super(...arguments);
        if (!(this instanceof TimeoutError)) {
            return new TimeoutError(message);
        }
        if (Error.captureStackTrace) {
            // This is better, because it makes the resulting stack trace have the correct error name.  But, it
            // only works in V8/Chrome.
            Error.captureStackTrace(this, this.constructor);
        } else {
            // Hackiness for other browsers.
            this.stack = (new Error(message)).stack;
        }
        this.message = message;
        this.name = "TimeoutError";
    }
}

/**
 * Returns a Promise which resolves after `ms` milliseconds have elapsed.  The returned Promise will never reject.
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

type Deferred<t> = {
    promise: Promise<t>;
    resolve: (result: t) => void;
    reject: (error: any) => any;
};

/**
 * Returns a `{promise, resolve, reject}` object.  The returned `promise` will resolve or reject when `resolve` or
 * `reject` are called.
 */
export function defer<t>(): Deferred<t> {
    const answer: Partial<Deferred<t>> = {};
    answer.promise = new Promise((resolve, reject) => {
        answer.resolve = resolve;
        answer.reject = reject;
    });
    return answer as Deferred<t>;
}

/**
 * Given an array, `tasks`, of functions which return Promises, executes each function in `tasks` in series, only
 * calling the next function once the previous function has completed.
 */
export function series<t>(tasks: PromiseGeneratingFunction<t>[]): Promise<t[]> {
    let results = [];
    return tasks.reduce(
        (series, task) =>
            series.then(task)
                .then((result) => {
                    results.push(result);
                }),
        Promise.resolve()
    ).then(() => results);
};

/**
 * Given an array, `tasks`, of functions which return Promises, executes each function in `tasks` in parallel.
 * If `limit` is supplied, then at most `limit` tasks will be executed concurrently.
 */
export function parallel<t>(tasks: PromiseGeneratingFunction<t>[], limit?: number): Promise<t[]> {
    if (!limit || limit < 1 || limit >= tasks.length) {
        return Promise.all(tasks.map((task) => Promise.resolve().then(task)));
    }

    return new Promise((resolve, reject) => {
        let results = [];

        let currentTask = 0;
        let running = 0;
        let errored = false;

        let startTask = () => {
            if (errored) { return; }
            if (currentTask >= tasks.length) { return; }

            let taskNumber = currentTask++;
            let task = tasks[taskNumber];
            running++;

            Promise.resolve()
                .then(task)
                .then(
                    (result) => {
                        results[taskNumber] = result;
                        running--;
                        if (currentTask < tasks.length && running < limit) {
                            startTask();
                        } else if (running === 0) {
                            resolve(results);
                        }
                    },
                    (err) => {
                        if (errored) { return; }
                        errored = true;
                        reject(err);
                    }
                );
        };

        // Start up `limit` tasks.
        for (let i = 0; i < limit; i++) {
            startTask();
        }
    });
}

export { parallel as parallelLimit };

type MapIterator<t, u> = (item: t, index: number) => Promise<u>;
/**
 * Given an array `arr` of items, calls `iter(item, index)` for every item in `arr`.  `iter()` should return a
 * Promise.  Up to `limit` items will be called in parallel (defaults to 1.)
 */
export function map<t, u>(arr: t[], iter: MapIterator<t, u>, limit?: number): Promise<u[]> {
    let taskLimit = limit;
    if (!limit || limit < 1) { taskLimit = 1; }
    if (limit >= arr.length) { taskLimit = arr.length; }

    let tasks = arr.map((item, index) => (() => iter(item, index)));
    return parallel(tasks, taskLimit);
}

/**
 * Add a timeout to an existing Promise.
 *
 * Resolves to the same value as `p` if `p` resolves within `ms` milliseconds, otherwise the returned Promise will
 * reject with the error "Timeout: Promise did not resolve within ${ms} milliseconds"
 */
export function timeout<t>(p: Promise<t>, ms: number): Promise<t> {
    // Create the error here so we keep the traceback.
    const timeoutError = new TimeoutError(`Timeout: Promise did not resolve within ${ms} milliseconds`)
    return new Promise((resolve, reject) => {
        let timer: Timeout = setTimeout(() => {
            timer = null;
            reject(timeoutError);
        }, ms);

        p.then(
            (result) => {
                if (timer !== null) {
                    timer.clear();
                    resolve(result);
                }
            },
            (err) => {
                if (timer !== null) {
                    timer.clear();
                    reject(err);
                }
            }
        );
    });
}

/**
 * Continually call `fn()` while `test()` returns true.
 *
 * `fn()` should return a Promise.  `test()` is a synchronous function which returns true of false.
 *
 * `whilst` will resolve to the last value that `fn()` resolved to, or will reject immediately with an error if
 * `fn()` rejects or if `fn()` or `test()` throw.
 */
export function whilst<t>(test: () => boolean, fn: PromiseGeneratingFunction<t>): Promise<t> {
    return new Promise((resolve, reject) => {
        let lastResult = null;
        let doIt = () => {
            try {
                if (test()) {
                    Promise.resolve()
                        .then(fn)
                        .then(
                            (result) => {
                                lastResult = result;
                                setTimeout(doIt, 0);
                            },
                            reject
                        );
                } else {
                    resolve(lastResult);
                }
            } catch (err) {
                reject(err);
            }
        };

        doIt();
    });
}

/**
 * Same as `whilst` but will call `test()` before trying `fn`
 */
export function doWhilst<t>(fn: PromiseGeneratingFunction<t>, test: () => boolean): Promise<t> {
    let first = true;
    let doTest = () => {
        let answer = first || test();
        first = false;
        return answer;
    };
    return whilst(doTest, fn);
};



/**
 * Function to be called until resolves by `retry`. It will be passed the `lastAttempt` failure of the previous call.
 */
type RetryTask<t> = (lastAttempt: any) => Promise<t>;

/**
 * Options for the retry method
 */
type RetryOptions = number | {
    times: number,
    interval: number
}

/**
 * keep calling `fn` until it returns a non-error value, doesn't throw, or returns a Promise that resolves. `fn` will be
 * attempted `times` many times before rejecting. If `times` is given as `Infinity`, then `retry` will attempt to
 * resolve forever (useful if you are just waiting for something to finish).
 */
export function retry<t>(options: RetryTask<t> | number | Partial<RetryOptions>, fn?: RetryTask<t>): Promise<t> {
    let times = 5;
    let interval = 0;
    let attempts = 0;
    let lastAttempt = null;

    function makeTimeOptionError(value: any) {
        return new Error(`Unsupported argument type for \'times\': ${typeof (value)}`);
    }

    if ('function' === typeof (options)) {
        fn = options;
    } else if ('number' === typeof (options)) {
        times = +options;
    } else if ('object' === typeof (options)) {
        if ('number' === typeof (options.times)) {
            times = +options.times;
        } else if (options.times) {
            return Promise.reject(makeTimeOptionError(options.times));
        }

        if (options.interval) {
            if (options.interval === Infinity) {
                return Promise.reject(new Error(`'interval' may not be Infinity`));
            }
            interval = +options.interval;
        }
    } else if (options) {
        return Promise.reject(makeTimeOptionError(options));
    } else {
        return Promise.reject(new Error('No parameters given'));
    }

    return new Promise((resolve, reject) => {
        let doIt = () => {
            Promise.resolve()
                .then(() => {
                    return fn(lastAttempt);
                })
                .then(resolve)
                .catch((err) => {
                    attempts++;
                    lastAttempt = err;
                    if (times !== Infinity && attempts === times) {
                        reject(lastAttempt);
                    } else {
                        setTimeout(doIt, interval);
                    }
                });
        };
        doIt();
    });
};

export default {
    TimeoutError,
    delay,
    defer,
    series,
    parallel,
    parallelLimit: parallel,
    map,
    timeout,
    whilst,
    doWhilst,
    retry,
};