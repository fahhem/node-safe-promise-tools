import {expect} from '@jest/globals';

let promiseTools = require('../src');

describe('TimeoutError', () => {
    it('should have correct type', () => {
        let err = new promiseTools.TimeoutError("timeout");
        expect(err instanceof promiseTools.TimeoutError).toBe(true);
        expect(err instanceof Error).toBe(true);
    });
});
