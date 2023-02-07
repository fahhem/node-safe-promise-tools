import {expect} from '@jest/globals';

let promiseTools = require('../src');

describe('series', () => {
    it('should execute multiple functions and return results', () => {
        let tasks = [
            () => Promise.resolve("a"),
            () => "b",
            () => Promise.resolve("c")
        ];

        return expect(promiseTools.series(tasks)).resolves.toEqual(['a', 'b', 'c']);
    });

    it('should execute multiple functions one by one', () => {
        let order = "";
        let tasks = [
            () =>
                promiseTools.delay(10)
                .then(() => {order = order + "a";})
            ,
            () => order = order + "b"
        ];

        return promiseTools.series(tasks)
        .then(() => {
            expect(order).toBe("ab");
        });
    });

    it('should stop if a function returns an error', () => {
        let order = "";
        let tasks = [
            () => promiseTools.delay(10).then(() => order = order + "a"),
            () => {throw new Error("boom")},
            () => order = order + "b"
        ];

        return expect(promiseTools.series(tasks)).rejects.toThrow("boom")
        .then(() => {
            // Should execute the first function, but not the third function.
            expect(order).toBe("a");
        });
    });
});
