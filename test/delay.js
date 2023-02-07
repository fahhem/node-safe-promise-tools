import {expect} from '@jest/globals';

let promiseTools = require('../src');

describe('delay', () => {
    it('should wait the specified delay and then resolve', () => {
        return expect(promiseTools.delay(10)).resolves.toBe();
    });
});
