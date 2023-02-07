import {expect} from '@jest/globals';

let promiseTools = require('../src');

describe('defer', () => {
    it('should resolve', () => {
        let deferred = promiseTools.defer();
        deferred.resolve("done");
        return expect(deferred.promise).resolves.toBe("done");
    });

    it('should reject', () => {
        const deferred = promiseTools.defer();
        deferred.reject(new Error("boom"));
        return expect(deferred.promise).rejects.toThrow("boom");
    });
});
