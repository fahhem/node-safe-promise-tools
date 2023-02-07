import {expect} from '@jest/globals';

let promiseTools = require('../src');

describe('timeout', () => {
    it('should resolve if the underlying promise resolves', () => {
        let p = promiseTools.delay(10).then(() => "done");
        return expect(promiseTools.timeout(p, 1000)).resolves.toBe("done");
    });

    it('should reject if the underlying promise reject', () => {
        let p = promiseTools.delay(10).then(() => {throw new Error("Boom")});
        return expect(promiseTools.timeout(p, 1000)).rejects.toThrow("Boom");
    });

    it('should reject if the underlying promise fails to resolve in time', () => {
        let p = promiseTools.delay(100).then(() => "done");
        return expect(promiseTools.timeout(p, 1)).rejects.toThrow(promiseTools.TimeoutError);
    });

    it('should reject if the underlying promise fails to reject in time', () => {
        let p = promiseTools.delay(100).then(() => {throw new Error("Boom")});
        return expect(promiseTools.timeout(p, 1)).rejects.toThrow(promiseTools.TimeoutError);
    });
});
