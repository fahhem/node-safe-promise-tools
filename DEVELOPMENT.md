The intention here is to mirror the API of other existing projects, such as
[bluebird](https://github.com/petkaantonov/bluebird) and [q](https://github.com/kriskowal/q), but to make this
agnostic to the Promise implementation.  When adding a new function, try to use the same API as these other libraries,
to make migration to `promise-tools` easy.  You can assume that `Promise` has any and all functions available
in the ECMAScript 2015 standard.

This repo switches to native typescript, so it invokes babel for all generated javascript.

PR's welcome to convert to tsc-based generation if possible, as `babel` is quite slow.