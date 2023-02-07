import {expect} from '@jest/globals';

let promiseTools = require('../src');

describe('parallel', () => {
    it('should execute multiple functions and return results', () => {
        let tasks = [
            () => Promise.resolve("a"),
            () => "b",
            () => Promise.resolve("c")
        ];

        return Promise.all(tasks.map((task) => task()))
        .then((expectedResults) => {
            return expect(promiseTools.parallel(tasks)).resolves.toEqual(expectedResults);
        });
    });

    it('should stop if a function returns an error', () => {
        let tasks = [
            () => "a",
            () => {throw new Error("boom")},
            () => "c"
        ];

        return expect(promiseTools.parallel(tasks)).rejects.toThrow("boom")
    });

    it('should execute multiple functions and return results with a limit supplied', () => {
        let tasks = [
            () => promiseTools.delay(10).then(() => "a"),
            () => "b",
            () => promiseTools.delay(10).then(() => "c")
        ];

        return Promise.all([
            // With 1 parallel
            expect(promiseTools.parallelLimit(tasks, 1)).resolves.toEqual(['a', 'b', 'c']),
            // With 2 parallel
            expect(promiseTools.parallelLimit(tasks, 2)).resolves.toEqual(['a', 'b', 'c']),
            // With 3 parallel
            expect(promiseTools.parallelLimit(tasks, 3)).resolves.toEqual(['a', 'b', 'c']),
            // With 4 parallel
            expect(promiseTools.parallelLimit(tasks, 4)).resolves.toEqual(['a', 'b', 'c'])
        ]);
    });

    it('should execute tasks concurrently to a limit', () => {
        let running = 0;
        let maxRunning = 0;
        let complete = 0;

        let task = () => {
            running++;
            maxRunning = Math.max(maxRunning, running);

            return promiseTools.delay(5)
            .then(() => {
                complete++;
                running--;
            });
        }
        let tasks = []
        for(let i = 0; i < 10; i++) {
            tasks.push(task);
        }

        return promiseTools.parallelLimit(tasks, 3)
        .then(() => {
            // max concurrent tasks
            expect(maxRunning).toBe(3);
            // tasks run
            expect(complete).toBe(10);
        });
    });

    it('should stop if a function returns an error when a limit is supplied', async () => {
        let tasks = [
            () => "a",
            () => {throw new Error("boom")},
            () => "b"
        ];

        await expect(promiseTools.parallelLimit(tasks, 1))
        .rejects.toBeDefined();

        return Promise.all([
            expect(promiseTools.parallelLimit(tasks, 1)).rejects.toThrow("boom"),
            expect(promiseTools.parallelLimit(tasks, 2)).rejects.toThrow("boom"),
            expect(promiseTools.parallelLimit(tasks, 3)).rejects.toThrow("boom"),
            expect(promiseTools.parallelLimit(tasks, 4)).rejects.toThrow("boom"),
        ]);
    });
});
