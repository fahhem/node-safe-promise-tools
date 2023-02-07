import {expect} from '@jest/globals';

let promiseTools = require('../src');

describe('map', () => {
    it('should map an array of values', () => {
        let arr = ['a', 'b', 'c'];
        let iter = (value, index) => Promise.resolve(value + index);
        return expect(promiseTools.map(arr, iter)).resolves.toEqual(['a0', 'b1', 'c2']);
    });

    it('should map an array of values without using promises', () => {
        let arr = ['a', 'b', 'c'];
        let iter = (value, index) => value + index;
        return expect(promiseTools.map(arr, iter)).resolves.toEqual(['a0', 'b1', 'c2']);
    });

    it('should work if the limit is 0, or too large', () => {
        let arr = ['a', 'b', 'c'];
        let iter = (value, index) => value + index;
        return expect(promiseTools.map(arr, iter, 0)).resolves.toEqual(['a0', 'b1', 'c2'])
        .then(() => expect(promiseTools.map(arr, iter, 100)).resolves.toEqual(['a0', 'b1', 'c2']));
    });

});
