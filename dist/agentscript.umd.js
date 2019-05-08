/* eslint-disable */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.AS = {})));
}(this, (function (exports) { 'use strict';

// A set of useful misc utils which will eventually move to individual files.
// Note we use arrow functions one-liners, more likely to be optimized.
// REMIND: Test optimization, if none, remove arrow one-liners.

const util = {
    // ### Types

    // Fix the javascript typeof operator https://goo.gl/Efdzk5
    typeOf: obj =>
        ({}.toString
            .call(obj)
            .match(/\s(\w+)/)[1]
            .toLowerCase()),
    isType: (obj, string) => util.typeOf(obj) === string,
    isOneOfTypes: (obj, array) => array.includes(util.typeOf(obj)),
    // Is a number an integer (rather than a float w/ non-zero fractional part)
    isString: obj => util.isType(obj, 'string'),
    isObject: obj => util.isType(obj, 'object'),
    isArray: obj => util.isType(obj, 'array'),
    isNumber: obj => util.isType(obj, 'number'),
    isFunction: obj => util.isType(obj, 'function'),

    isInteger: n => Number.isInteger(n), // assume es6, babel otherwise.
    isFloat: n => util.isNumber(n) && n % 1 !== 0, // https://goo.gl/6MS0Tm
    isCanvas: obj =>
        util.isOneOfTypes(obj, ['htmlcanvaselement', 'offscreencanvas']),
    isHtmlElement: obj => /^html.*element$/.test(util.typeOf(obj)),

    isImage: obj => util.isType(obj, 'image'),
    isImageBitmap: obj => util.isType(obj, 'imagebitmap'),

    // Is undefined, null, bool, number, string, symbol
    isPrimitive: obj => obj == null || 'object' != typeof obj,

    isImageable: obj =>
        util.isOneOfTypes(obj, [
            'image',
            'htmlimageelement',
            'htmlcanvaselement',
            'offscreencanvas',
            'imagebitmap',
        ]),

    // isUintArray: (obj) => util.typeOf(obj).match(/uint.*array/),
    isUintArray: obj => /^uint.*array$/.test(util.typeOf(obj)),
    isIntArray: obj => /^int.*array$/.test(util.typeOf(obj)),
    isFloatArray: obj => /^float.*array$/.test(util.typeOf(obj)),
    // Is obj TypedArray? If obj.buffer not present, works, type is 'undefined'
    isTypedArray: obj => util.typeOf(obj.buffer) === 'arraybuffer',

    // Return array's type (Array or TypedArray variant)
    typeName: obj => obj.constructor.name,

    // Check [big/little endian](https://en.wikipedia.org/wiki/Endianness)
    isLittleEndian() {
        const d32 = new Uint32Array([0x01020304]);
        return new Uint8ClampedArray(d32.buffer)[0] === 4
    },

    // inNode: () =>
    //     typeof window === 'undefined' && typeof global !== 'undefined',
    // inBrowser: () => !util.inNode(),
    // globalObject: () => (util.inNode() ? global : window),

    globalObject() {
        // return window ? window : global ? global : self ? self : undefined
        return window !== undefined
            ? window
            : global !== undefined
                ? global
                : self !== undefined
                    ? self
                    : undefined
    },

    // Identity fcn, returning its argument unchanged. Used in callbacks
    identity: o => o,
    // No-op function, does nothing. Used for default callback.
    noop: () => {},
    // Return function returning an object's property.  Property in fcn closure.
    propFcn: prop => o => o[prop],

    // Convert Array or TypedArray to given Type (Array or TypedArray).
    // Result same length as array, precision may be lost.
    convertArray(array, Type) {
        const Type0 = array.constructor;
        if (Type0 === Type) return array // return array if already same Type
        return Type.from(array) // Use .from (both TypedArrays and Arrays)
    },
    // Convert to/from new Uint8Array view onto an Array or TypedArray.
    // Arrays converted to ArrayType, default Float64Array.
    // Return will in general be a different length than array
    arrayToBuffer(array, ArrayType = Float64Array) {
        if (array.constructor === Array) array = new ArrayType(array);
        return new Uint8Array(array.buffer)
    },
    bufferToArray(uint8array, Type, ArrayType = Float64Array) {
        if (Type === Array) Type = ArrayType;
        return Type === Array
            ? Array.from(new ArrayType(uint8array.buffer))
            : new Type(uint8array.buffer)
        // return new Type(uint8array.buffer)
    },

    // Convert between Uint8Array buffer and base64 string.
    // https://coolaj86.com/articles/typedarray-buffer-to-base64-in-javascript/
    // Stack Overflow: https://goo.gl/xscs8T
    bufferToBase64(uint8Array) {
        const binstr = Array.prototype.map
            .call(uint8Array, ch => String.fromCharCode(ch))
            .join('');
        return btoa(binstr)
    },
    base64ToBuffer(base64) {
        const binstr = atob(base64);
        const uint8Array = new Uint8Array(binstr.length);
        Array.prototype.forEach.call(binstr, (ch, i) => {
            uint8Array[i] = ch.charCodeAt(0);
        });
        return uint8Array
    },

    // ### Debug

    // Two PRNGs.
    randomSeedSin(seed = Math.PI / 4) {
        // ~3.4 million b4 repeat.
        // https://stackoverflow.com/a/19303725/1791917
        return () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x)
        }
    },
    randomSeedParkMiller(seed = 123456) {
        // doesn't repeat b4 JS dies.
        // https://gist.github.com/blixt/f17b47c62508be59987b
        seed = seed % 2147483647;
        return () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646
        }
    },
    // Replace Math.random with one of these
    randomSeed(seed, useParkMiller = true) {
        Math.random = useParkMiller
            ? this.randomSeedParkMiller(seed)
            : this.randomSeedSin(seed);
    },

    // Print a message just once.
    logOnce(msg) {
        if (!this.logOnceMsgSet) this.logOnceMsgSet = new Set();
        if (!this.logOnceMsgSet.has(msg)) {
            console.log(msg);
            this.logOnceMsgSet.add(msg);
        }
    },
    warn(msg) {
        this.logOnce('Warning: ' + msg);
    },
    // Print a message to an html element or to console.
    // Default to document.body if in browser.
    // Default to console.log if in node.
    // If msg is an object, convert to JSON
    // print(msg, element = null) {
    //     if (this.isObject(msg)) msg = JSON.stringify(msg)
    //     // if (!element && this.inBrowser()) element = document.body
    //     if (!element && document) element = document.body

    //     if (element) {
    //         element.style.fontFamily = 'monospace'
    //         element.innerHTML += msg + '<br />'
    //     } else {
    //         console.log(msg)
    //     }
    // },

    printToPage(msg, element = document.body) {
        if (util.isObject(msg)) {
            msg = JSON.stringify(msg, null, 2);
            msg = '<pre>' + msg + '</pre>';
        }

        element.style.fontFamily = 'monospace';
        element.innerHTML += msg + '<br />';
    },

    logHistogram(name, array) {
        // const hist = AgentArray.fromArray(dataset.data).histogram()
        const hist = this.histogram(array);
        const { min, max } = hist.parameters;
        console.log(
            `${name}:`, // name + ':'
            hist.toString(),
            'min/max:',
            min.toFixed(3),
            max.toFixed(3)
        );
    },

    // Use chrome/ffox/ie console.time()/timeEnd() performance functions
    timeit(f, runs = 1e5, name = 'test') {
        name = name + '-' + runs;
        console.time(name);
        for (let i = 0; i < runs; i++) f(i);
        console.timeEnd(name);
    },

    fps() {
        const start = performance.now();
        let steps = 0;
        // return function step() {
        //     steps++
        //     const ms = performance.now() - start
        //     const fps = parseFloat((steps / (ms / 1000)).toFixed(2))
        //     Object.assign(step, { fps, ms, start, steps })
        // }
        function perf() {
            steps++;
            const ms = performance.now() - start;
            const fps = parseFloat((steps / (ms / 1000)).toFixed(2));
            Object.assign(perf, { fps, ms, start, steps });
        }
        perf.steps = 0;
        return perf
    },

    // Print Prototype Stack: see your vars all the way down!
    pps(obj, title = '') {
        if (title) console.log(title); // eslint-disable-line
        let count = 1;
        let str = '';
        while (obj) {
            if (typeof obj === 'function') {
                str = obj.constructor.toString();
            } else {
                const okeys = Object.keys(obj);
                str =
                    okeys.length > 0
                        ? `[${okeys.join(', ')}]`
                        : `[${obj.constructor.name}]`;
            }
            console.log(`[${count++}]: ${str}`);
            obj = Object.getPrototypeOf(obj);
        }
    },

    // Return a string representation of an array of arrays
    arraysToString: arrays => arrays.map(a => `[${a}]`).join(','),

    // Merge from's key/val pairs into to the global/window namespace
    toWindow(obj, logToo = false) {
        Object.assign(window, obj);
        // Object.assign(this.globalObject(), obj)
        console.log('toWindow:', Object.keys(obj).join(', '));
        if (logToo) {
            Object.keys(obj).forEach(key => console.log('  ', key, obj[key]));
        }
    },
    // toWindow plus also calling console.log for each item.
    toConsole(obj) {
        this.toWindow(obj);
        Object.keys(obj).forEach(key => console.log('  ', key, obj[key]));
    },
    toGlobal(obj) {
        Object.assign(this.globalObject(), obj);
        console.log('toWindow:', Object.keys(obj).join(', '));
    },

    // Use JSON to return pretty, printable string of an object, array, other
    // Remove ""s around keys.
    objectToString(obj) {
        return JSON.stringify(obj, null, '  ')
            .replace(/ {2}"/g, '  ')
            .replace(/": /g, ': ')
    },
    // Like above, but a single line for small objects.
    objectToString1(obj) {
        return JSON.stringify(obj)
            .replace(/{"/g, '{')
            .replace(/,"/g, ',')
            .replace(/":/g, ':')
    },

    // ### HTML, CSS, DOM

    // REST: Parse the query, returning an object of key/val pairs.
    // parseQueryString() {
    //     const results = {}
    //     const query = document.location.search.substring(1)
    //     query.split('&').forEach(s => {
    //         const param = s.split('=')
    //         // If just key, no val, set val to true
    //         results[param[0]] = param.length === 1 ? true : param[1]
    //     })
    //     return results
    // },
    parseQueryString(paramsString = window.location.search.substr(1)) {
        const results = {};
        const searchParams = new URLSearchParams(paramsString);
        for (var pair of searchParams.entries()) {
            let [key, val] = pair;

            if (val.match(/^[0-9.]+$/)) val = Number(val);
            if (['true', 't', ''].includes(val)) val = true;
            if (['false', 'f'].includes(val)) val = false;

            results[key] = val;
        }
        return results
    },

    // Create dynamic `<script>` tag, appending to `<head>`
    //   <script src="./test/src/three0.js" type="module"></script>
    setScript(path, props = {}) {
        const scriptTag = document.createElement('script');
        scriptTag.src = path;
        // this.forEach(props, (val, key) => { scriptTag[key] = val })
        Object.assign(scriptTag, props);
        document.querySelector('head').appendChild(scriptTag);
    },

    // Convert a function into a worker via blob url.
    // Adds generic error handler. Scripts only, not modules.
    fcnToWorker(fcn) {
        const href = document.location.href;
        const root = href.replace(/\/[^\/]+$/, '/');
        const fcnStr = `(${fcn.toString(root)})("${root}")`;
        const objUrl = URL.createObjectURL(
            new Blob([fcnStr], { type: 'text/javascript' })
        );
        const worker = new Worker(objUrl);
        worker.onerror = function(e) {
            console.log('ERROR: Line ', e.lineno, ': ', e.message);
        };
        return worker
    },

    workerScript(script, worker) {
        const srcBlob = new Blob([script], { type: 'text/javascript' });
        const srcURL = URL.createObjectURL(srcBlob);
        worker.postMessage({ cmd: 'script', url: srcURL });
    },

    // Get element (i.e. canvas) relative x,y position from event/mouse position.
    getEventXY(element, evt) {
        // http://goo.gl/356S91
        const rect = element.getBoundingClientRect();
        return [evt.clientX - rect.left, evt.clientY - rect.top]
    },

    // ### Math

    // Return random int/float in [0,max) or [min,max) or [-r/2,r/2)
    randomInt: max => Math.floor(Math.random() * max),
    randomInt2: (min, max) => min + Math.floor(Math.random() * (max - min)),
    randomFloat: max => Math.random() * max,
    randomFloat2: (min, max) => min + Math.random() * (max - min),
    randomCentered: r => util.randomFloat2(-r / 2, r / 2),
    // min: (a, b) => (a < b) ? a : b, // Math.max/min now faster, yay!
    // max: (a, b) => (a < b) ? b : a,

    // Return float Gaussian normal with given mean, std deviation.
    randomNormal(mean = 0.0, sigma = 1.0) {
        // Box-Muller
        const [u1, u2] = [1.0 - Math.random(), Math.random()]; // ui in 0,1
        const norm =
            Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return norm * sigma + mean
    },

    // Return whether num is [Power of Two](http://goo.gl/tCfg5). Very clever!
    isPowerOf2: num => (num & (num - 1)) === 0, // twgl library
    // Return next greater power of two. There are faster, see:
    // [Stack Overflow](https://goo.gl/zvD78e)
    nextPowerOf2: num => Math.pow(2, Math.ceil(Math.log2(num))),

    // A [modulus](http://mathjs.org/docs/reference/functions/mod.html)
    // function rather than %, the remainder function.
    // [`((v % n) + n) % n`](http://goo.gl/spr24) also works.
    mod: (v, n) => ((v % n) + n) % n, // v - n * Math.floor(v / n),
    // Wrap v around min, max values if v outside min, max
    wrap: (v, min, max) => min + util.mod(v - min, max - min),
    // Clamp a number to be between min/max.
    // Much faster than Math.max(Math.min(v, max), min)
    clamp(v, min, max) {
        if (v < min) return min
        if (v > max) return max
        return v
    },
    // Return true is val in [min, max] enclusive
    between: (val, min, max) => min <= val && val <= max,

    // Return a linear interpolation between lo and hi.
    // Scale is in [0-1], a percentage, and the result is in [lo,hi]
    // If lo>hi, scaling is from hi end of range.
    // [Why the name `lerp`?](http://goo.gl/QrzMc)
    lerp: (lo, hi, scale) =>
        lo <= hi ? lo + (hi - lo) * scale : lo - (lo - hi) * scale,
    // Calculate the lerp scale given lo/hi pair and a number between them.
    lerpScale: (number, lo, hi) => (number - lo) / (hi - lo),

    // ### Geometry

    // Degrees & Radians
    // radians: (degrees) => util.mod(degrees * Math.PI / 180, Math.PI * 2),
    // degrees: (radians) => util.mod(radians * 180 / Math.PI, 360),
    radians: degrees => (degrees * Math.PI) / 180,
    degrees: radians => (radians * 180) / Math.PI,
    // Heading & Angles:
    // * Heading is 0-up (y-axis), clockwise angle measured in degrees.
    // * Angle is euclidean: 0-right (x-axis), counterclockwise in radians
    heading(radians) {
        // angleToHeading?
        const degrees = this.degrees(radians);
        return this.mod(90 - degrees, 360)
    },
    angle(heading) {
        // headingToAngle?
        const degrees = this.mod(360 - heading, 360);
        return this.radians(degrees)
    },
    // Return angle (radians) in (-pi,pi] that added to rad0 = rad1
    // See NetLogo's [subtract-headings](http://goo.gl/CjoHuV) for explanation
    subtractRadians(rad1, rad0) {
        let dr = this.mod(rad1 - rad0, 2 * Math.PI);
        if (dr > Math.PI) dr = dr - 2 * Math.PI;
        return dr
    },
    // Above using headings (degrees) returning degrees in (-180, 180]
    subtractHeadings(deg1, deg0) {
        let dAngle = this.mod(deg1 - deg0, 360);
        if (dAngle > 180) dAngle = dAngle - 360;
        return dAngle
    },
    // Return angle in [-pi,pi] radians from (x,y) to (x1,y1)
    // [See: Math.atan2](http://goo.gl/JS8DF)
    radiansToward: (x, y, x1, y1) => Math.atan2(y1 - y, x1 - x),
    // Above using headings (degrees) returning degrees in [-90, 90]
    headingToward(x, y, x1, y1) {
        return this.heading(this.radiansToward(x, y, x1, y1))
    },

    // Return distance between (x, y), (x1, y1)
    distance: (x, y, x1, y1) => Math.sqrt(util.sqDistance(x, y, x1, y1)),
    // Return squared distance .. i.e. avoid Math.sqrt. Faster comparisons
    sqDistance: (x, y, x1, y1) => (x - x1) * (x - x1) + (y - y1) * (y - y1),
    // Return true if x,y is within cone.
    // Cone: origin x0,y0 in given direction, with coneAngle width in radians.
    // All angles in radians
    inCone(x, y, radius, coneAngle, direction, x0, y0) {
        if (this.sqDistance(x0, y0, x, y) > radius * radius) return false
        const angle12 = this.radiansToward(x0, y0, x, y); // angle from 1 to 2
        return (
            coneAngle / 2 >= Math.abs(this.subtractRadians(direction, angle12))
        )
    },

    // ### Arrays, Objects and Iteration

    // objectPropertyTypes(obj) {
    //     const propNames = Object.keys(obj)
    //     const result = {}
    //     for (const prop of propNames) {
    //         result[prop] = this.typeOf(obj[prop])
    //     }
    //     return result
    // },

    // getNestedObject(object, string) {
    //     const objs = string.split('.')
    //     if (objs.length === 1) return object[string]
    //     return objs.reduce((acc, val) => {
    //         if (acc === undefined) return undefined
    //         return acc[val]
    //     }, object)
    // },
    nestedProperty(obj, path) {
        if (typeof path === 'string') path = path.split('.');
        switch (path.length) {
        case 1:
            return obj[path[0]]
        case 2:
            return obj[path[0]][path[1]]
        case 3:
            return obj[path[0]][path[1]][path[2]]
        case 4:
            return obj[path[0]][path[1]][path[2]][path[3]]
        default:
            return path.reduce((obj, param) => obj[param], obj)
        }
    },

    // Repeat function f(i, a) n times, i in 0, n-1
    // a is optional array, default a new Array.
    // Return a.
    repeat(n, f, a = []) {
        for (let i = 0; i < n; i++) f(i, a);
        return a
    },
    // Repeat function n/step times, incrementing i by step each step.
    step(n, step, f) {
        for (let i = 0; i < n; i += step) f(i);
    },
    // Return range [0, length-1]. Note: 6x faster than Array.from!
    range(length) {
        return this.repeat(length, (i, a) => {
            a[i] = i;
        })
    },
    // range (length) { return this.repeat(length, (i, a) => { a[i] = i }, []) },

    arrayMax: array => array.reduce((a, b) => Math.max(a, b)),
    arrayMin: array => array.reduce((a, b) => Math.min(a, b)),
    arrayExtent: array => [util.arrayMin(array), util.arrayMax(array)],
    arraySum: array => array.reduce((a, b) => a + b, 0),
    arraysEqual(a1, a2) {
        if (a1.length !== a2.length) return false
        for (let i = 0; i < a1.length; i++) {
            if (a1[i] !== a2[i]) return false
        }
        return true
    },
    removeArrayItem(array, item) {
        const ix = array.indexOf(item);
        if (ix !== -1) array.splice(ix, 1);
        else this.warn(`removeArrayItem: ${item} not in array`);
        return array // for chaining
    },

    // Execute fcn for all own member of an obj or array (typed OK).
    // Return input arrayOrObj, transformed by fcn.
    // - Unlike forEach, does not skip undefines.
    // - Like map, forEach, etc, fcn = fcn(item, key/index, obj).
    // - Alternatives are: `for..of`, array map, reduce, filter etc
    forEach(arrayOrObj, fcn) {
        if (arrayOrObj.slice) {
            // typed & std arrays
            for (let i = 0, len = arrayOrObj.length; i < len; i++) {
                fcn(arrayOrObj[i], i, arrayOrObj);
            }
        } else {
            // obj
            Object.keys(arrayOrObj).forEach(k =>
                fcn(arrayOrObj[k], k, arrayOrObj)
            );
        }
        return arrayOrObj
    },
    // forEach(array, fcn) {
    //     // typed & std arrays
    //     for (let i = 0, len = array.length; i < len; i++) {
    //         fcn(array[i], i, array)
    //     }
    // },
    // forEachKey(obj, fcn) {
    //     Object.keys(obj).forEach(k => fcn(obj[k], k, obj))
    // },

    // Return a new shallow of array, either Array or TypedArray
    clone(array) {
        return array.slice(0)
    },

    // Return a new array that is the concatination two arrays.
    // The resulting Type is that of the first array.
    concatArrays(array1, array2) {
        const Type = array1.constructor;
        if (Type === Array) {
            return array1.concat(this.convertArray(array2, Array))
        }
        const array = new Type(array1.length + array2.length);
        // NOTE: typedArray.set() allows any Array or TypedArray arg
        array.set(array1);
        array.set(array2, array1.length);
        return array
    },

    // Compare Objects or Arrays via JSON string. Note: TypedArrays !== Arrays
    objectsEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),

    // Create a histogram, given an array, a bin size, and a
    // min bin defaulting to min of of the array.
    // Return an object with:
    // - min/maxBin: the first/last bin with data
    // - min/maxVal: the min/max values in the array
    // - bins: the number of bins
    // - hist: the array of bins
    // histogram(array, bin = 1, min = Math.floor(this.arrayMin(array))) {
    //     const hist = []
    //     let [minBin, maxBin] = [Number.MAX_VALUE, Number.MIN_VALUE]
    //     let [minVal, maxVal] = [Number.MAX_VALUE, Number.MIN_VALUE]
    //     for (const a of array) {
    //         const i = Math.floor(a / bin) - min
    //         hist[i] = hist[i] === undefined ? 1 : hist[i] + 1
    //         minBin = Math.min(minBin, i)
    //         maxBin = Math.max(maxBin, i)
    //         minVal = Math.min(minVal, a)
    //         maxVal = Math.max(maxVal, a)
    //     }
    //     for (const i in hist) {
    //         if (hist[i] === undefined) {
    //             hist[i] = 0
    //         }
    //     }
    //     const bins = maxBin - minBin + 1
    //     return { bins, minBin, maxBin, minVal, maxVal, hist }
    // },

    histogram(
        array,
        bins = 10,
        min = this.arrayMin(array),
        max = this.arrayMax(array)
    ) {
        const binSize = (max - min) / bins;
        const hist = new Array(bins);
        hist.fill(0);
        this.forEach(array, val => {
            // const val = key ? a[key] : a
            if (val < min || val > max) {
                util.warn(`histogram bounds error: ${val}: ${min}-${max}`);
            } else {
                let bin = Math.floor((val - min) / binSize);
                if (bin === bins) bin--; // val is max, round down
                hist[bin]++;
            }
        });
        // Object.assign(hist, {bins, min, max, binSize, key})
        hist.parameters = { bins, min, max, binSize, arraySize: array.length };
        return hist
    },

    // Return random one of array items.
    oneOf: array => array[util.randomInt(array.length)],
    otherOneOf(array, item) {
        if (array.length < 2) throw Error('util.otherOneOf: array.length < 2')
        do {
            var other = this.oneOf(array);
        } while (item === other) // note var use
        return other
    },

    // Random key/val of object
    oneKeyOf: obj => util.oneOf(Object.keys(obj)),
    oneValOf: obj => obj[util.oneKeyOf(obj)],

    // You'd think this wasn't necessary, but I always forget. Damn.
    // NOTE: this, like sort, sorts in place. Clone array if needed.
    sortNums(array, ascending = true) {
        return array.sort((a, b) => (ascending ? a - b : b - a))
    },
    // Sort an array of objects w/ fcn(obj) as compareFunction.
    // If fcn is a string, convert to propFcn.
    sortObjs(array, fcn, ascending = true) {
        if (typeof fcn === 'string') fcn = this.propFcn(fcn);
        const comp = (a, b) => fcn(a) - fcn(b);
        return array.sort((a, b) => (ascending ? comp(a, b) : -comp(a, b)))
    },
    // Randomize array in-place. Use clone() first if new array needed
    // The array is returned for chaining; same as input array.
    // See [Durstenfeld / Fisher-Yates-Knuth shuffle](https://goo.gl/mfbdPh)
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array
    },
    // Returns new array (of this type) of unique elements in this *sorted* array.
    // Sort or clone & sort if needed.
    uniq(array, f = this.identity) {
        if (this.isString(f)) f = this.propFcn(f);
        return array.filter((ai, i, a) => i === 0 || f(ai) !== f(a[i - 1]))
    },
    // Simple uniq on sorted or unsorted array.
    uniqUnsorted: array => Array.from(new Set(array)),

    // Return a "ramp" (array of uniformly ascending/descending floats)
    // in [start,stop] with numItems (positive integer > 1).
    // OK for start>stop. Will always include start/stop w/in float accuracy.
    aRamp(start, stop, numItems) {
        // NOTE: start + step*i, where step is (stop-start)/(numItems-1),
        // has float accuracy problems, must recalc step each iteration.
        if (numItems <= 1) throw Error('aRamp: numItems must be > 1')
        const a = [];
        for (let i = 0; i < numItems; i++) {
            a.push(start + (stop - start) * (i / (numItems - 1)));
        }
        return a
    },
    // Integer version of aRamp, start & stop integers, rounding each element.
    // Default numItems yields unit step between start & stop.
    aIntRamp(start, stop, numItems = Math.abs(stop - start) + 1) {
        return this.aRamp(start, stop, numItems).map(a => Math.round(a))
    },

    // Return an array normalized (lerp) between lo/hi values
    normalize(array, lo = 0, hi = 1) {
        const [min, max] = [this.arrayMin(array), this.arrayMax(array)];
        const scale = 1 / (max - min);
        return array.map(n => this.lerp(lo, hi, scale * (n - min)))
    },
    // Return Uint8ClampedArray normalized in 0-255
    normalize8(array) {
        return new Uint8ClampedArray(this.normalize(array, -0.5, 255.5))
    },
    // Return Array normalized to integers in lo-hi
    normalizeInt(array, lo, hi) {
        return this.normalize(array, lo, hi).map(n => Math.round(n))
    },

    // ### OofA/AofO

    isOofA(data) {
        // const isAofO = this.isArray(data) && this.isObject(data[0])
        // return !isAofO
        if (!this.isObject(data)) return false
        // return Object.values(data).every(v => Array.isArray(v))
        return Object.values(data).every(v => util.isTypedArray(v))
    },
    toOofA(aofo, spec) {
        const length = aofo.length;
        const keys = Object.keys(spec);
        const oofa = {};
        keys.forEach(k => {
            oofa[k] = new spec[k](length);
        });
        util.forEach(aofo, (o, i) => {
            keys.forEach(key => (oofa[key][i] = o[key]));
        });

        return oofa
    },
    oofaObject(oofa, i, keys) {
        const obj = {};
        keys.forEach(key => {
            obj[key] = oofa[key][i];
        });
        return obj
    },
    toAofO(oofa, keys = Object.keys(oofa)) {
        const length = oofa[keys[0]].length;
        const aofo = new Array(length);
        this.forEach(aofo, (val, i) => {
            aofo[i] = this.oofaObject(oofa, i, keys);
        });
        return aofo
    },
    oofaBuffers(postData) {
        const buffers = [];
        this.forEach(postData, obj =>
            this.forEach(obj, a => buffers.push(a.buffer))
        );
        return buffers
    },

    // ### Async

    // Return Promise for getting an image.
    // - use: imagePromise('./path/to/img').then(img => imageFcn(img))
    imagePromise(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(Error(`Could not load image ${url}`));
            img.src = url;
        })
    },

    // Convert canvas.toBlob to a promise
    canvasBlobPromise(can, mimeType = 'image/png', quality = 0.95) {
        return new Promise((resolve, reject) => {
            can.toBlob(blob => resolve(blob), mimeType, quality);
        })
    },
    // Return Promise for ajax/xhr data.
    // - type: 'arraybuffer', 'blob', 'document', 'json', 'text'.
    // - method: 'GET', 'POST'
    // - use: xhrPromise('./path/to/data').then(data => dataFcn(data))
    xhrPromise(url, type = 'text', method = 'GET') {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url); // POST mainly for security and large files
            xhr.responseType = type;
            xhr.onload = () => resolve(xhr.response);
            xhr.onerror = () =>
                reject(Error(`Could not load ${url}: ${xhr.status}`));
            xhr.send();
        })
    },

    // Return promise for pause of ms. Use:
    // timeoutPromise(2000).then(()=>console.log('foo'))
    timeoutPromise(ms = 1000) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        })
    },
    // Use above for an animation loop.
    // steps < 0: forever (default), steps === 0 is no-op
    // Returns a promise for when done. If forever, no need to use it.
    async timeoutLoop(fcn, steps = -1, ms = 0) {
        let i = 0;
        while (i++ !== steps) {
            fcn(i - 1);
            await this.timeoutPromise(ms);
        }
    },

    yieldLoop(fcn, steps = -1) {
        let i = 0;
        function* gen() {
            while (i++ !== steps) {
                yield fcn(i - 1);
            }
        }
        const iterator = gen();
        while (!iterator.next().done) {}
    },

    // Similar pair for requestAnimationFrame
    rafPromise() {
        return new Promise(resolve => requestAnimationFrame(resolve))
    },
    async rafLoop(fcn, steps = -1) {
        let i = 0;
        while (i++ !== steps) {
            fcn(i - 1);
            await this.rafPromise();
        }
    },

    // // Imports a script, waits 'till loaded, then resolves. Use:
    // // scriptPromise('../lib/pako.js', 'pako')
    // //   .then((script) => console.log(script))
    // scriptPromise (path, name, f = () => window[name], props = {}) {
    //   if (window[name] == null) this.setScript(path, props)
    //   return this.waitPromise(() => window[name] != null, f)
    // },
    // // Promise: Wait until done(), then resolve with f()'s value, default to noop
    // // Ex: This waits until window.foo is defined, then reports:
    // // waitPromise(()=>window.foo).then(()=>console.log('foo defined'))
    // waitPromise (done, f = this.noop, ms = 10) {
    //   return new Promise((resolve, reject) => {
    //     this.waitOn(done, () => resolve(f()), ms)
    //   })
    // },
    waitPromise(done, ms = 10) {
        return new Promise(resolve => {
            function waitOn() {
                if (done()) return resolve()
                else setTimeout(waitOn, ms);
            }
            waitOn();
        })
    },
    // // Callback: Wait (setTimeout) until done() true, then call f()
    // waitOn (done, f, ms = 10) {
    //   if (done())
    //     f()
    //   else
    //     setTimeout(() => { this.waitOn(done, f, ms) }, ms)
    // },

    // ### Canvas utilities

    // Create a blank 2D canvas of a given width/height
    // width/height defaulted so can be modified later by caller
    createCanvas(width = 0, height = 0, offscreen = true) {
        // Try OffscreenCanvas in workers and main:
        // if (OffscreenCanvas) return new OffscreenCanvas(width, height)
        // Fallback to DOM if in main
        // if (document) return document.createElement('canvas')
        // Error if in worker and no OffscreenCanvas
        // throw Error(
        //     'createCanvas: Browser does not support worker OffscreenCanvas'
        // )
        if (offscreen) return new OffscreenCanvas(width, height)
        const can = document.createElement('canvas');
        can.width = width;
        can.height = height;
        return can
    },
    // As above, but returing the 2D context object.
    // NOTE: ctx.canvas is the canvas for the ctx, and can be use as an image.
    createCtx(width, height, offscreen = true) {
        const can = this.createCanvas(width, height, offscreen);
        return can.getContext('2d')
    },

    // Duplicate a ctx's image. Returns the new ctx (who's canvas is ctx.caanvas)
    // cloneCtx(ctx0, offscreen = true) {
    //     const ctx = this.createCtx(
    //         ctx0.canvas.width,
    //         ctx0.canvas.height,
    //         offscreen
    //     )
    //     ctx.drawImage(ctx0.canvas, 0, 0)
    //     return ctx
    // },
    // Duplicate a ctx's image. Returns the new ctx (who's canvas is ctx.caanvas)
    // resizeCtx(ctx, width, height) {
    //     const copy = this.cloneCtx(ctx)
    //     ctx.canvas.width = width
    //     ctx.canvas.height = height
    //     ctx.drawImage(copy.canvas, 0, 0)
    // },
    cloneCanvas(can, offscreen = true) {
        const ctx = this.createCtx(can.width, can.height, offscreen);
        ctx.drawImage(can, 0, 0);
        return ctx.canvas
    },
    // Resize a ctx/canvas and preserve data.
    resizeCtx(ctx, width, height) {
        const copy = this.cloneCanvas(ctx.canvas);
        ctx.canvas.width = width;
        ctx.canvas.height = height;
        ctx.drawImage(copy, 0, 0);
    },

    // Set the ctx/canvas size if differs from width/height.
    // It does not install a transform and assumes there is not one currently installed.
    // The World object can do that for AgentSets.
    setCanvasSize(can, width, height) {
        if (can.width !== width || can.height != height) {
            can.width = width;
            can.height = height;
        }
    },

    // Install identity transform for this context.
    // Call ctx.restore() to revert to previous transform.
    setIdentity(ctx) {
        ctx.save(); // NOTE: Does not change state, only saves current state.
        ctx.setTransform(1, 0, 0, 1, 0, 0); // or ctx.resetTransform()
    },
    // Set the text font, align and baseline drawing parameters.
    // Ctx can be either a canvas context or a DOM element
    // See [reference](http://goo.gl/AvEAq) for details.
    // * font is a HTML/CSS string like: "9px sans-serif"
    // * align is left right center start end
    // * baseline is top hanging middle alphabetic ideographic bottom
    setTextParams(ctx, font, textAlign = 'center', textBaseline = 'middle') {
        // ctx.font = font; ctx.textAlign = align; ctx.textBaseline = baseline
        Object.assign(ctx, { font, textAlign, textBaseline });
    },

    // Return the (complete) ImageData object for this context object
    ctxImageData(ctx) {
        return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
    },
    // Fill this context with the given css color string.
    clearCtx(ctx) {
        util.setIdentity(ctx);
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    },
    // Fill this context with the given css color string.
    fillCtx(ctx, cssColor) {
        util.setIdentity(ctx);
        ctx.fillStyle = cssColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    },
    // Fill this context with the given image. Will scale image to fit ctx size.
    fillCtxWithImage(ctx, img) {
        this.setIdentity(ctx); // set/restore identity
        ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
    },
    // Fill this context with the given image, resizing it to img size if needed.
    setCtxImage(ctx, img) {
        this.setCanvasSize(ctx.canvas, img.width, img.height);
        this.fillCtxWithImage(ctx, img);
        // this.setIdentity(ctx)
        // ctx.drawImage(img, 0, 0, img.width, img.height)
        // ctx.restore()
    },

    // Use webgl texture to convert img to Uint8Array w/o alpha premultiply
    // or color profile modification.
    // Img can be Image, ImageData, Canvas: [See MDN](https://goo.gl/a3oyRA).
    // `flipY` is used to invert image to upright.
    imageToBytesCtx: null,
    imageToBytes(img, flipY = false, imgFormat = 'RGBA') {
        // Create the gl context using the image width and height
        if (!this.imageToBytesCtx) {
            const can = this.createCanvas(0, 0);
            this.imageToBytesCtx = can.getContext('webgl', {
                premultipliedAlpha: false,
            });
        }

        const { width, height } = img;
        const gl = this.imageToBytesCtx;
        Object.assign(gl.canvas, { width, height });
        const fmt = gl[imgFormat];

        // Create and initialize the texture.
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        if (flipY) {
            // Mainly used for pictures rather than data
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        }
        // Insure [no color profile applied](https://goo.gl/BzBVJ9):
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        // Insure no [alpha premultiply](http://goo.gl/mejNCK).
        // False is the default, but lets make sure!
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
        gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        // Create the framebuffer used for the texture
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            texture,
            0
        );

        // See if it all worked. Apparently not async.
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            throw Error(
                `imageToBytes: status not FRAMEBUFFER_COMPLETE: ${status}`
            )
        }

        // If all OK, create the pixels buffer and read data.
        const pixSize = imgFormat === 'RGB' ? 3 : 4;
        const pixels = new Uint8Array(pixSize * width * height);
        // gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        gl.readPixels(0, 0, width, height, fmt, gl.UNSIGNED_BYTE, pixels);

        // Unbind the framebuffer and return pixels
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return pixels
    },
};

// An Array superclass with convenience methods used by NetLogo.
// Tipically the items in the array are Objects, NetLogo Agents,
// but generally useful as an ArrayPlus

class AgentArray extends Array {
    // Convert an Array to an AgentArray "in place".
    // Use array.slice() if a new array is wanted
    static fromArray(array) {
        Object.setPrototypeOf(array, AgentArray.prototype);
        return array
    }

    // constructor not needed, JS passes on if ctor same as super's
    // constructor () { super() }

    // Convert between AgentArrays and Arrays
    toArray() {
        Object.setPrototypeOf(this, Array.prototype);
        return this
    }

    // NL: Return true if reporter true for all of this set's objects
    // Use Array.every(). Also Array.some()
    // all (reporter) { return this.every(reporter) }
    // // Return !isEmpty()
    // any () { return this.length !== 0 }
    // NL: Return AgentArray with reporter(agent) true. Use Array.filter()
    // with (reporter) { return this.filter(reporter) }

    // Return true if there are no items in this set, false if not empty.
    // NL: uses "empty", confusing. Also uses any() .. use !isEmpty()
    isEmpty() {
        return this.length === 0
    }
    // Return first item in this array. Returns undefined if empty.
    first() {
        return this[0]
    }
    // Return last item in this array. Returns undefined if empty.
    last() {
        return this[this.length - 1]
    }
    // Return array of property values for key from this array's objects.
    // Array type is specified, defaulted to AgentArray
    // Note: forEach & map WAY slower than for loop
    props(key, type = AgentArray) {
        const result = new type(this.length);
        for (let i = 0; i < this.length; i++) {
            result[i] = this[i][key];
        }
        return result
    }
    // Creates an OofA for several sets of props.
    // Obj is key, arrayType pairs: x: Float32Array
    // Result is this.props(key, arrayType) for each key
    propsObject(obj) {
        // const length = this.length
        const result = {};
        util.forEach(obj, (val, key) => {
            result[key] = this.props(key, val);
        });
        return result
    }

    // Return AgentArray of results of the function fcn
    // Similar to "props" but can return computation over all keys
    // Odd: as.props('type') twice as fast as as.results(p => p.type)?
    results(fcn) {
        const result = new AgentArray(this.length);
        for (let i = 0; i < this.length; i++) {
            result[i] = fcn(this[i]);
        }
        return result
    }
    // Returns AgentArray of unique elements in this *sorted* AgentArray.
    // Use sortBy or clone & sortBy if needed.
    // uniq(f = util.identity) {
    //     if (util.isString(f)) f = o => o[f]
    //     return this.filter((ai, i, a) => i === 0 || f(ai) !== f(a[i - 1]))
    // }

    // Call fcn(agent, index, array) for each agent in AgentArray.
    // Array assumed not mutable
    // Note: 5x+ faster than this.forEach(fcn) !!
    each(fcn) {
        for (let i = 0, len = this.length; i < len; i++) {
            fcn(this[i], i, this);
        }
        // return this
    }

    // Call fcn(agent, index, array) for each item in AgentArray.
    // Array can shrink. If it grows, will not visit beyond original length
    ask(fcn) {
        const length = this.length;
        // for (let i = 0; i < length || i < this.length; i++) {
        for (let i = 0; i < Math.min(length, this.length); i++) {
            fcn(this[i], i, this);
        }
        if (length != this.length) {
            const name = this.name || this.constructor.name;
            const direction = this.length < length ? 'decreasing' : 'increasing';
            util.warn(`AgentArray.ask array mutation: ${name}: ${direction}`);
        }
        // return this
    }

    // Return count of agents with reporter(agent) true
    count(reporter) {
        return this.reduce((prev, o) => prev + (reporter(o) ? 1 : 0), 0)
    }

    sum(key) {
        return this.reduce((prev, o) => prev + (key ? o[key] : o), 0)
    }
    avg(key) {
        return this.sum(key) / this.length
    }
    min(key) {
        return this.reduce(
            (prev, o) => Math.min(prev, key ? o[key] : o),
            Infinity
        )
    }
    max(key) {
        return this.reduce(
            (prev, o) => Math.max(prev, key ? o[key] : o),
            -Infinity
        )
    }
    histogram(key, bins = 10, min = this.min(key), max = this.max(key)) {
        const binSize = (max - min) / bins;
        const aa = new AgentArray(bins);
        aa.fill(0);
        this.ask(a => {
            const val = key ? a[key] : a;
            if (val < min || val > max) {
                util.warn(`histogram bounds error: ${val}: ${min}-${max}`);
            } else {
                let bin = Math.floor((val - min) / binSize);
                if (bin === bins) bin--; // val is max, round down
                aa[bin]++;
            }
        });
        // Object.assign(aa, {bins, min, max, binSize, key})
        aa.parameters = { key, bins, min, max, binSize, arraySize: this.length };
        // console.log(key, bins, min, max, binSize, aa)
        return aa
    }

    // Return shallow copy of a portion of this AgentArray
    // [See Array.slice](https://goo.gl/Ilgsok)
    // Default is to clone entire AgentArray
    cloneRange(begin = 0, end = this.length) {
        return this.slice(begin, end) // Returns an AgentArray rather than Array!
    }
    clone() {
        return this.slice(0) // Returns an AgentArray rather than Array!
    }
    // Randomize the AgentArray in place. Use clone first if new AgentArray needed.
    // Return "this" for chaining.
    shuffle() {
        return util.shuffle(this)
    }
    // Return this AgentArray sorted by the reporter in ascending/descending order.
    // If reporter is a string, convert to a fcn returning that property.
    // Use clone if you don't want to mutate this array.
    sortBy(reporter, ascending = true) {
        util.sortObjs(this, reporter, ascending);
        return this
    }

    // Remove an item from an array. Binary search if f given
    // Array unchanged if item not found.
    remove(o, f) {
        const i = this.agentIndex(o, f);
        if (i !== -1) this.splice(i, 1);
        else util.warn(`remove: ${o} not in AgentArray`);
        return this // chaining
    }
    insert(o, f) {
        const i = this.sortedIndex(o, f);
        if (this[i] === o) throw Error('insert: item already in AgentArray')
        this.splice(i, 0, o); // copyWithin?
    }

    // Binary search:
    // Return array index of item, where array is sorted.
    // If item not found, return index for item for array to remain sorted.
    // f is used to return an integer for sorting, defaults to identity.
    // If f is a string, it is the object property to sort by.
    // Adapted from underscore's _.sortedIndex.
    sortedIndex(item, f = util.identity) {
        if (util.isString(f)) f = util.propFcn(f);
        const value = f(item);
        // Why not array.length - 1? Because we can insert 1 after end of array.
        // let [low, high] = [0, array.length]
        let low = 0;
        let high = this.length;
        while (low < high) {
            const mid = (low + high) >>> 1; // floor (low+high)/2
            if (f(this[mid]) < value) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return low
    }
    // Return index of value in array with given property or -1 if not found.
    // Binary search if property isnt null
    // Property can be string or function.
    // Use property = identity to compare objs directly.
    agentIndex(item, property) {
        if (!property) return this.indexOf(item)
        const i = this.sortedIndex(item, property);
        return this[i] === item ? i : -1
    }
    // True if item is in array. Binary search if f given
    contains(item, f) {
        return this.agentIndex(item, f) >= 0
    }

    // Return a random agent. Return undefined if empty.
    oneOf() {
        return util.oneOf(this)
    }
    // Return a random agent, not equal to agent
    otherOneOf(agent) {
        return util.otherOneOf(this, agent)
    }
    // Return n other random agents from this array
    // otherNOf (n, agent) { return util.otherNOf(n, this, agent) }
    otherNOf(n, item) {
        if (this.length < n) throw Error('AgentArray: otherNOf: length < N')
        return this.clone()
            .remove(item)
            .shuffle()
            .slice(0, n)
    }

    // Return the first agent having the min/max of given value of f(agent).
    // If reporter is a string, convert to a fcn returning that property
    minOrMaxOf(min, reporter, valueToo = false) {
        if (this.isEmpty()) throw Error('min/max OneOf: empty array')
        if (typeof reporter === 'string') reporter = util.propFcn(reporter);
        let o = null;
        let val = min ? Infinity : -Infinity;
        for (let i = 0; i < this.length; i++) {
            const a = this[i];
            const aval = reporter(a);
            if ((min && aval < val) || (!min && aval > val)) {
                [o, val] = [a, aval];
            }
        }
        return valueToo ? [o, val] : o
    }
    // The min version of the above
    minOneOf(reporter) {
        return this.minOrMaxOf(true, reporter)
    }
    // The max version of the above
    maxOneOf(reporter) {
        return this.minOrMaxOf(false, reporter)
    }
    // Like the pair above, but return both the object and its value in an array.
    // const [obj, value] = minValOf(...)
    minValOf(reporter) {
        return this.minOrMaxOf(true, reporter, true)
    }
    maxValOf(reporter) {
        return this.minOrMaxOf(false, reporter, true)
    }

    // Return n random agents as AgentArray.
    // See [Fisher-Yates-Knuth shuffle](https://goo.gl/fWNFf)
    // for better approach for large n.
    nOf(n) {
        if (n > this.length) throw Error('nOf: n larger than AgentArray')
        if (n === this.length) return this
        const result = new AgentArray();
        while (result.length < n) {
            const o = this.oneOf();
            if (!(o in result)) result.push(o);
        }
        return result
    }
    // Return a new AgentArray of the n min/max agents of the value of reporter,
    // in ascending order.
    // If reporter is a string, convert to a fcn returning that property
    // NOTE: we do not manage ties, see NetLogo docs.
    minOrMaxNOf(min, n, reporter) {
        if (n > this.length) {
            throw Error('min/max nOf: n larger than AgentArray')
        }
        const as = this.clone().sortBy(reporter);
        return min ? as.clone(0, n) : as.clone(as.length - n)
    }
    minNOf(n, reporter) {
        return this.minOrMaxNOf(true, n, reporter)
    }
    maxNOf(n, reporter) {
        return this.minOrMaxNOf(false, n, reporter)
    }

    // Geometry methods for patches, turtles, and other AgentArrays which have x,y.
    // Return all agents within rect, radius, cone from given agent o.
    // If meToo, include given object, default excludes it
    // Typically the AgentArray is a subset of larger sets, reducing
    // the size, then uses these inRect, inRadius or inCone methods

    // Return all agents within rectangle from given agent o.
    // dx & dy are (float) half width/height of rect
    inRect(o, dx, dy = dx, meToo = false) {
        const agents = new AgentArray();
        const minX = o.x - dx; // ok if max/min off-world, o, a are in-world
        const maxX = o.x + dx;
        const minY = o.y - dy;
        const maxY = o.y + dy;
        this.ask(a => {
            if (minX <= a.x && a.x <= maxX && minY <= a.y && a.y <= maxY) {
                if (meToo || o !== a) agents.push(a);
            }
        });
        return agents
    }

    // Return all agents in AgentArray within d distance from given object.
    inRadius(o, radius, meToo = false) {
        const agents = new AgentArray();
        // const {x, y} = o // perf?
        const d2 = radius * radius;
        const sqDistance = util.sqDistance; // Local function 2-3x faster, inlined?
        this.ask(a => {
            if (sqDistance(o.x, o.y, a.x, a.y) <= d2) {
                if (meToo || o !== a) agents.push(a);
            }
        });
        return agents
    }

    // As above, but also limited to the angle `coneAngle` around
    // a `direction` from object `o`.
    inCone(o, radius, coneAngle, direction, meToo = false) {
        const agents = new AgentArray();
        this.ask(a => {
            if (util.inCone(a.x, a.y, radius, coneAngle, direction, o.x, o.y)) {
                if (meToo || o !== a) agents.push(a);
            }
        });
        return agents
    }
}

// AgentSets are arrays that are factories for their own agents/objects.
// They are the base for Patches, Turtles and Links.

// Vocab: AgentSets are NetLogo collections: Patches, Turtles, and Links.
// Agent is an object in an AgentSet: Patch, Turtle, Link.

class AgentSet extends AgentArray {
    // Magic to return AgentArray's rather than AgentSets
    // Symbol.species: https://goo.gl/Zsxwxd
    static get [Symbol.species]() {
        return AgentArray
    }

    // Create an empty `AgentSet` and initialize the `ID` counter for add().
    // If baseSet is supplied, the new agentset is a subarray of baseSet.
    // This sub-array feature is how breeds are managed, see class `Model`
    constructor(model, AgentClass, name, baseSet = null) {
        super(); // create empty AgentArray
        baseSet = baseSet || this; // if not a breed, set baseSet to this
        Object.assign(this, { model, name, baseSet, AgentClass });
        // BaseSets know their breeds and keep the ID global
        if (this.isBaseSet()) {
            this.breeds = {}; // will contain breedname: breed entries
            this.ID = 0;
            // Breeds inherit frm their baseSet and add themselves to baseSet
        } else {
            Object.setPrototypeOf(this, Object.getPrototypeOf(baseSet));
            this.baseSet.breeds[name] = this;
        }
        // Keep a list of this set's variables; see `own` below
        this.ownVariables = [];
        // Create a proto for our agents by having a defaults and instance layer
        // this.AgentClass = AgentClass
        this.agentProto = new AgentClass(this);
        this.protoMixin(this.agentProto, AgentClass);
        // }
    }
    // All agents have:
    // vars: id, agentSet, model, world, breed (getter)
    //   baseSet by name: turtles/patches/links
    // methods: setBreed, getBreed, isBreed
    // getter/setter: breed
    protoMixin(agentProto, AgentClass) {
        Object.assign(agentProto, {
            agentSet: this,
            model: this.model,
            // world: this.world
        });
        agentProto[this.baseSet.name] = this.baseSet;

        // if (this.isBaseSet()) {
        // Model.reset should not redefine these.
        if (!AgentClass.prototype.setBreed) {
            Object.assign(AgentClass.prototype, {
                setBreed(breed) {
                    breed.setBreed(this);
                },
                getBreed() {
                    return this.agentSet
                },
                isBreed(breed) {
                    return this.agentSet === breed
                },
            });
            Object.defineProperty(AgentClass.prototype, 'breed', {
                get: function() {
                    return this.agentSet
                },
            });
        }
    }

    // Create a subarray of this AgentSet. Example: create a people breed of turtles:
    // `people = turtles.newBreed('people')`
    newBreed(name) {
        return new AgentSet(this.model, this.AgentClass, name, this)
    }

    // Is this a baseSet or a derived "breed"
    isBreedSet() {
        return this.baseSet !== this
    }
    isBaseSet() {
        return this.baseSet === this
    }

    // Return breeds in a subset of an AgentSet.
    // Ex: patches.inRect(5).withBreed(houses)
    withBreed(breed) {
        return this.filter(a => a.agentSet === breed)
    }

    // Abstract method used by subclasses to create and add their instances.
    create() {
        console.log(`AgentSet: Abstract method called: ${this}`);
    }

    // Add an agent to the list.  Only used by agentset factory methods. Adds
    // the `id` property to all agents. Increment `ID`.
    // Returns the object for chaining. The set will be sorted by `id`.
    addAgent(o) {
        // o only for breeds adding themselves to their baseSet
        o = o || Object.create(this.agentProto); // REMIND: Simplify! Too slick.
        if (this.isBreedSet()) this.baseSet.addAgent(o);
        else o.id = this.ID++;
        this.push(o);
        return o
    }
    clear() {
        // die() is an agent method. sets it's id to -1
        while (!this.isEmpty()) this.last().die();
    }
    // Remove an agent from the agentset, returning the agentset for chaining.
    // Note removeAgent(agent) different than remove(agent) which simply removes
    // the agent from it's array
    removeAgent(o) {
        // Remove me from my baseSet
        if (this.isBreedSet()) this.baseSet.remove(o, 'id');
        // Remove me from my set.
        this.remove(o, 'id');
        return this
    }

    // AgentSets often need a random color. We use a standard shared ColorMap map.
    // randomColor () { return ColorMap.Basic16.randomColor() }

    // Get/Set default values for this agentset's agents.
    // Return this for chaining
    setDefault(name, value) {
        this.agentProto[name] = value;
        return this
    }
    getDefault(name) {
        return this.agentProto[name]
    }
    // Used when getter/setter's need to know if get/set default
    settingDefault(agent) {
        return agent.id == null
    }

    // Declare variables of an agent class. May deprecate if not needed.
    // `varnames` is a string of space separated names
    own(varnames) {
        // if (this.isBreedSet())
        //   this.ownVariables = util.clone(this.baseSet.ownVariables)
        for (const name of varnames.split(' ')) {
            this.setDefault(name, null);
            this.ownVariables.push(name);
        }
    }

    // Move an agent from its AgentSet/breed to be in this AgentSet/breed.
    setBreed(a) {
        // change agent a to be in this breed
        // Return if `a` is already of my breed
        if (a.agentSet === this) return
        // Remove/insert breeds (not baseSets) from their agentsets
        if (a.agentSet.isBreedSet()) a.agentSet.remove(a, 'id');
        if (this.isBreedSet()) this.insert(a, 'id');

        // Make list of `a`'s vars and my ownvars.
        const avars = a.agentSet.ownVariables;
        // First remove `a`'s vars not in my ownVariables
        for (const avar of avars) {
            if (!this.ownVariables.includes(avar)) delete a[avar];
        }
        // Now add ownVariables to `a`'s vars, default to 0.
        // If ownvar already in avars, it is not modified.
        for (const ownvar of this.ownVariables) {
            if (!avars.includes(ownvar)) a[ownvar] = 0;
        } // NOTE: NL uses 0, maybe we should use null?

        // Give `a` my defaults/statics
        return Object.setPrototypeOf(a, this.agentProto)
    }

    ask(fcn) {
        if (this.length === 0) return
        const lastID = this.last().id;
        for (let i = 0; i < this.length && this[i].id <= lastID; i++) {
            // for (let i = 0; this[i].id <= lastID; i++) { // nope.
            fcn(this[i], i, this);
        }
    }
    // Call fcn(agent, index, array) for each item in AgentArray.
    // Return the AgentArray for chaining.
    // Note: 5x+ faster than this.forEach(fcn) !!
    // Manages immutability reasonably well.
    askSet(fcn) {
        if (this.length === 0) return
        // Patches are static
        if (this.name === 'patches') super.each(fcn);
        else if (this.isBaseSet()) this.baseSetAsk(fcn);
        else if (this.isBreedSet()) this.cloneAsk(fcn);
    }
    // askSet(fcn) {
    //     if (this.length === 0) return
    //     // Patches are static
    //     if (this.name === 'patches') return super.each(fcn)
    //     if (this.isBaseSet()) return this.baseSetAsk(fcn)
    //     if (this.isBreedSet()) return this.cloneAsk(fcn)
    // }

    // An ask function for mutable baseSets.
    // BaseSets can only add past the end of the array.
    // This allows us to manage mutations by allowing length change,
    // and managing deletions only within the original length.
    baseSetAsk(fcn) {
        if (this.length === 0) return
        // const length = this.length
        const lastID = this.last().id;

        // Added obj's have id > lastID. Just check for deletions.
        // There Be Dragons:
        // - AgentSet can become length 0 if all deleted
        // - While loop tricky:
        //   - i can become negative w/in while loop:
        //   - i can become bigger than current AgentSet:
        //   - Guard w/ i<len & i>=0
        for (let i = 0; i < this.length; i++) {
            const obj = this[i];
            const id = obj.id;
            if (id > lastID) break
            fcn(obj, i, this);
            if (i >= this.length) break
            if (this[i].id > id) {
                while (i >= 0 && this[i].id > id) i--; // ok if -1
            }
        }
    }
    // baseSetAsk(fcn) {
    //     if (this.length === 0) return
    //     // const length = this.length
    //     const lastID = this.last().id

    //     // Added obj's have id > lastID. Just check for deletions.
    //     // There Be Dragons:
    //     // - AgentSet can become length 0 if all deleted
    //     // - While loop tricky:
    //     //   - i can beocme negative w/in while loop:
    //     //   - i can beocme bigger than current AgentSet:
    //     //   - Guard w/ i<len & i>=0
    //     for (let i = 0; i < this.length && this[i].id <= lastID; i++) {
    //         const id = this[i].id
    //         fcn(this[i], i, this)
    //         while (i < this.length && i >= 0 && this[i].id > id) {
    //             i--
    //         }
    //     }
    // }

    // For breeds, mutations can occur in many ways.
    // This solves this by cloning the initial array and
    // managing agents that have died or changed breed.
    // In other words, we can be concerned only with mutations
    // of the agents themselves.
    cloneAsk(fcn) {
        const clone = this.clone();
        for (let i = 0; i < clone.length; i++) {
            const obj = clone[i];
            // obj.id > 0: obj.die() sets id to -1
            if (obj.breed == this && obj.id > 0) {
                fcn(obj, i, clone);
            }
        }
        // return this
    }

    // Temp: data transfer. May not use if AgentArray.propsObject
    // (OofA) is sufficient.
    propsArrays(keys, indexed = true) {
        const result = indexed ? {} : new AgentArray(this.length);
        if (util.isString(keys)) keys = keys.split(' ');
        for (let i = 0; i < this.length; i++) {
            const vals = [];
            const agent = this[i];
            for (let j = 0; j < keys.length; j++) {
                vals.push(agent[keys[j]]);
            }
            result[indexed ? agent.id : i] = vals;
        }
        return result
    }
    propsObjects(keys, indexed = true) {
        const result = indexed ? {} : new AgentArray(this.length);
        // if (util.isString(keys)) keys = keys.split(' ')
        if (util.isString(keys)) keys = keys.split(/,*  */);
        for (let i = 0; i < this.length; i++) {
            const vals = {};
            const agent = this[i];
            for (let j = 0; j < keys.length; j++) {
                // Parse key/val pair for nested objects
                let key = keys[j],
                    val;
                if (key.includes(':')) {
                    [key, val] = key.split(':');
                    val = util.getNestedObject(agent, val);
                } else {
                    if (key.includes('.')) {
                        throw Error(
                            'propsObjects: dot notation requires name:val: ' +
                                key
                        )
                    }
                    val = agent[key];
                }

                // If function, val is result of calling it w/ no args
                if (util.typeOf(val) === 'function') val = agent[val.name]();

                // Do id substitution for arrays & objects
                if (util.isArray(val)) {
                    if (util.isInteger(val[0].id)) {
                        if (val.ID) {
                            throw Error(
                                'propsObjects: value cannot be an AgentSet: ' +
                                    key
                            )
                        }
                        // assume all are agents, replace w/ id
                        val = val.map(v => v.id);
                    } else {
                        // Should check that all values are primitives
                        val = util.clone(val);
                    }
                } else if (util.isObject(val)) {
                    if (util.isInteger(val.id)) {
                        val = val.id;
                    } else {
                        val = Object.assign({}, obj);
                        util.forEach(val, (v, key) => {
                            // Should check that all values are primitives
                            if (util.isInteger(v.id)) {
                                v[key] = v.id;
                            }
                        });
                    }
                }

                vals[key] = val;
            }
            result[indexed ? agent.id : i] = vals;
        }
        return result
    }
}

// A **DataSet** is an object with width/height and an array
// whose length = width * height
//
// The data array can be a TypedArray or a javascript Array
// Notice that it is very much like an ImageData object!

class DataSet {
    // **Static methods:** called via DataSet.foo(), similar to Math.foo().
    // Generally useful utilities for use with TypedArrays & JS Arrays

    // Return an empty dataset of given width, height, dataType
    static emptyDataSet(width, height, Type) {
        return new DataSet(width, height, new Type(width * height))
    }

    // The **DataSet Class** constructor and methods

    // constructor: Stores the three DataSet components.
    // Checks data is right size, throws an error if not.
    constructor(width, height, data) {
        if (data.length !== width * height) {
            throw Error(
                `new DataSet length: ${data.length} !== ${width} * ${height}`
            )
        }
        Object.assign(this, { width, height, data });
    }

    // Get/Set name, useful for storage key.
    setName(string) {
        this.name = string;
        return this
    }
    getName() {
        return this.name ? this.name : this.makeName()
    }
    makeName() {
        const { width, height } = this;
        const sum = util.arraySum(this.data).toFixed(2);
        return `${this.dataType().name}-${width}-${height}-${sum}`
    }

    // Checks x,y are within DataSet. Throw error if not.
    checkXY(x, y) {
        if (!this.inBounds(x, y)) {
            throw Error(`DataSet: x,y out of range: ${x}, ${y}`)
        }
    }
    // true if x,y in dataset bounds
    inBounds(x, y) {
        return (
            util.between(x, 0, this.width - 1) &&
            util.between(y, 0, this.height - 1)
        )
    }

    dataType() {
        return this.data.constructor
    }
    type() {
        return this.constructor
    }

    // Given x,y in data space, return index into data
    toIndex(x, y) {
        return x + y * this.width
    }

    // Given index into data, return dataset [x, y] position
    toXY(i) {
        return [i % this.width, Math.floor(i / this.width)]
    }

    // Get dataset value at x,y, assuming that x,y valididated previously
    // getXY (x, y) { return this.data[this.toIndex(Math.floor(x), Math.floor(y))] }
    getXY(x, y) {
        return this.data[this.toIndex(x, y)]
    }

    // Set the data value at x,y to num. assume x,y valid
    // setXY (x, y, num) { this.data[this.toIndex(Math.floor(x), Math.floor(y))] = num }
    setXY(x, y, num) {
        this.data[this.toIndex(x, y)] = num;
    }

    // Wrapper for sampling, defaults to "nearest". Checks x,y valid as well.
    // Use this for individual sampling.
    sample(x, y, useNearest = true) {
        this.checkXY(x, y);
        return useNearest ? this.nearest(x, y) : this.bilinear(x, y)
    }

    // Nearest neighbor sampling, w/o x,y validity check, i.e. our inner loops
    nearest(x, y) {
        return this.getXY(Math.round(x), Math.round(y))
    }

    // Billinear sampling w/o x,y validity check, i.e. our inner loops
    bilinear(x, y) {
        // Billinear sampling works by making two linear interpolations (lerps)
        // in the x direction, and a third in the y direction, between the
        // two x results. See wikipedia:
        // [bilinear sampling](http://en.wikipedia.org/wiki/Bilinear_interpolation)
        // The diagram shows the three lerps

        // const [x0, y0] = [Math.floor(x), Math.floor(y)] // replaced by next line for speed
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const i = this.toIndex(x0, y0);
        const w = this.width;
        const dx = x - x0;
        const dy = y - y0;
        const dx1 = 1 - dx;
        const dy1 = 1 - dy;
        const f00 = this.data[i];
        // Edge case: fij is 0 if beyond data array; undefined -> 0.
        // This cancels the given component's factor in the result.
        const f10 = this.data[i + 1] || 0; // 0 at bottom right corner
        const f01 = this.data[i + w] || 0; // 0 at all bottom row
        const f11 = this.data[i + 1 + w] || 0; // 0 at end of next to bottom row
        // This is a bit involved but:
        // ```
        // If dx = 0; dx1 = 1, dy != 0
        // -> vertical linear interpolation
        // fxy = f00(1-dy) + f01(dy) i.e. y-lerp
        //
        // If dx != 0; dy = 0, dx !=0
        // -> horizontal linear interpolation
        // fxy = f00(1-dx) + f10(dx) i.e. x-lerp
        // ```
        return f00 * dx1 * dy1 + f10 * dx * dy1 + f01 * dx1 * dy + f11 * dx * dy
    }

    // Return a copy of this, with new data array
    copy() {
        return new DataSet(this.width, this.height, util.clone(this.data))
    }

    // Return new (empty) dataset, defaulting to this type
    emptyDataSet(width, height, type = this.dataType()) {
        return DataSet.emptyDataSet(width, height, type) // see static above
    }

    // Return new (empty) array of this type
    emptyArray(length) {
        const Type = this.type();
        return new Type(length)
    }

    // Create new dataset of size width/height/type by resampling each point.
    // Type is not this.type() due to integer/float differences. Default Array.
    // If same size, return a copy of this.
    resample(width, height, useNearest = true, Type = Array) {
        if (width === this.width && height === this.height) return this.copy()
        const ds = DataSet.emptyDataSet(width, height, Type);
        const xScale = (this.width - 1) / (width - 1);
        const yScale = (this.height - 1) / (height - 1);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                ds.setXY(x, y, this.sample(x * xScale, y * yScale, useNearest));
            }
        }
        return ds
    }

    // Scale each data element to be between min/max
    // This is a linear scale from this dataset's min/max
    // y = mx + b
    // scale (ds, min, max) {
    scale(min, max) {
        // const data = ds.data
        const dsMin = this.min();
        const dsMax = this.max();
        const dsDelta = dsMax - dsMin;
        const delta = max - min;
        const m = delta / dsDelta;
        const b = min - m * dsMin;
        // const scaledData = data.map((x) => m * x + b)
        // return new DataSet(ds.width, ds.height, scaledData)
        return this.map(x => m * x + b)
    }

    // Return a rectangular subset of the dataset.
    // Returned dataset is of same array type as this.
    subset(x, y, width, height) {
        if (x + width > this.width || y + height > this.height) {
            throw Error('DataSet.subSet: params out of range')
        }
        const ds = this.emptyDataSet(width, height);
        for (let i = 0; i < width; i++) {
            for (let j = 0; j < height; j++) {
                ds.setXY(i, j, this.getXY(i + x, j + y));
            }
        }
        return ds
    }

    // Return maped dataset by applying f to each dataset element
    map(f) {
        return new DataSet(this.width, this.height, this.data.map(f))
    }

    // Return the column of data at position x as this array's type
    col(x) {
        const [w, h, data] = [this.width, this.height, this.data];
        if (x >= w) throw Error(`col: x out of range width: ${w} x: ${x}`)
        const colData = this.emptyArray(h);
        for (let i = 0; i < h; i++) colData[i] = data[x + i * w];
        return colData
    }

    // Return the row of data at position y as this array's type
    row(y) {
        const [w, h] = [this.width, this.height];
        if (y >= h) throw Error(`row: y out of range height: ${h} x: ${y}`)
        return this.data.slice(y * w, (y + 1) * w)
    }

    // Convert this dataset's data to new type. Precision may be lost.
    // Does nothing if current data is already of this Type.
    convertType(type) {
        this.data = util.convertArray(this.data, type);
    }

    // Concatinate a dataset of equal height to my right to my east.
    // New DataSet is of same type as this.
    //
    // NOTE: concatWest is dataset.concatEast(this)
    concatEast(ds) {
        const [w, h] = [this.width, this.height];
        const [w1, h1] = [ds.width, ds.height];
        if (h !== h1) throw Error(`concatEast: heights not equal ${h}, ${h1}`)
        const ds1 = this.emptyDataSet(w + w1, h);
        // copy this into new dataset
        for (let x = 0; x < h; x++) {
            for (let y = 0; y < w; y++) {
                ds1.setXY(x, y, this.getXY(x, y));
            }
        }
        // copy ds to the left side
        for (let x = 0; x < h1; x++) {
            for (let y = 0; y < w1; y++) {
                ds1.setXY(x + w, y, ds.getXY(x, y));
            }
        }
        return ds1
    }

    // Concatinate a dataset of equal width to my south, returning new DataSet.
    // New DataSet is of same type as this.
    //
    // NOTE: concatNorth is dataset.concatSouth(this)
    concatSouth(dataset) {
        const [w, h, data] = [this.width, this.height, this.data];
        if (w !== dataset.width) {
            throw Error(`concatSouth: widths not equal ${w}, ${dataset.width}`)
        }
        const data1 = util.concatArrays(data, dataset.data);
        return new DataSet(w, h + dataset.height, data1)
    }

    // return dataset x,y given x,y in a euclidean space defined by tlx, tly, w, h
    // x,y is in topleft-bottomright box: [tlx,tly,tlx+w,tly-h], y positive util.
    // Ex: NetLogo's coords: x, y, minXcor, maxYcor, numX, numY
    transformCoords(x, y, tlx, tly, w, h) {
        const xs = (x - tlx) * (this.width - 1) / w;
        const ys = (tly - y) * (this.height - 1) / h;
        return [xs, ys]
    }

    // get a sample using a transformed euclidean coord system; see above
    coordSample(x, y, tlx, tly, w, h, useNearest = true) {
        const [xs, ys] = this.transformCoords(x, y, tlx, tly, w, h);
        return this.sample(xs, ys, useNearest)
    }

    // Return Array 3x3 neighbor values of the given x,y of the dataset.
    // Off-edge neighbors revert to nearest edge value.
    neighborhood(x, y, array = []) {
        array.length = 0; // in case user supplied an array to reduce GC
        const clampNeeded =
            x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1;
        for (let dy = -1; dy <= +1; dy++) {
            for (let dx = -1; dx <= +1; dx++) {
                let x0 = x + dx;
                let y0 = y + dy;
                if (clampNeeded) {
                    x0 = util.clamp(x0, 0, this.width - 1);
                    y0 = util.clamp(y0, 0, this.height - 1);
                }
                array.push(this.data[this.toIndex(x0, y0)]);
            }
        }
        return array
    }

    // Return a new dataset of this array type convolved with the
    // given kernel 3x3 matrix.
    // See [Convolution](https://en.wikipedia.org/wiki/Kernel_(image_processing))
    //
    // If cropped, do not convolve the edges, returning a smaller dataset.
    // If not, convolve the edges by extending edge values, returning
    // dataset of same size.
    convolve(kernel, factor = 1, crop = false) {
        const [x0, y0, h, w] = crop // optimization not needed, only called once
            ? [1, 1, this.height - 1, this.width - 1]
            : [0, 0, this.height, this.width];
        const newDS = this.emptyDataSet(w, h);
        const newData = newDS.data;
        let i = 0;
        for (let y = y0; y < h; y++) {
            for (let x = x0; x < w; x++) {
                const nei = this.neighborhood(x, y);
                // remind: use reduce if performant
                let sum2 = 0;
                for (let i2 = 0; i2 < kernel.length; i2++) {
                    // sum2 += kernel[i2] * nei[i2] // Chrome can't optimize compound let
                    sum2 = sum2 + kernel[i2] * nei[i2];
                }
                newData[i++] = sum2 * factor; // newDS.data[newDS.toIndex(x, y)] = sum2 * factor
            }
        }
        return newDS
    }

    // A few common convolutions.  dzdx/y are also called horiz/vert Sobel
    dzdx(n = 2, factor = 1 / 8) {
        return this.convolve([-1, 0, 1, -n, 0, n, -1, 0, 1], factor)
    }
    dzdy(n = 2, factor = 1 / 8) {
        return this.convolve([1, n, 1, 0, 0, 0, -1, -n, -1], factor)
    }
    laplace8() {
        return this.convolve([-1, -1, -1, -1, 8, -1, -1, -1, -1])
    }
    laplace4() {
        return this.convolve([0, -1, 0, -1, 4, -1, 0, -1, 0])
    }
    blur(factor = 0.0625) {
        // 1/16 = 0.0625
        return this.convolve([1, 2, 1, 2, 4, 2, 1, 2, 1], factor)
    }
    edge() {
        return this.convolve([1, 1, 1, 1, -7, 1, 1, 1, 1])
    }

    // Create two new Array convolved datasets, slope and aspect, common in
    // the use of an elevation data set. See Esri tutorials for
    // [slope](http://goo.gl/ZcOl08) and [aspect](http://goo.gl/KoI4y5)
    //
    // It also returns the two derivitive DataSets, dzdx, dzdy for
    // those wanting to use the results of the two convolutions.
    //
    // Use this.convertType to convert to typed array
    slopeAndAspect(cellSize = 1, posAngle = true) {
        const dzdx = this.dzdx(); // sub left z from right
        const dzdy = this.dzdy(); // sub bottom z from top
        let [aspect, slope] = [[], []];
        const [h, w] = [dzdx.height, dzdx.width];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const [gx, gy] = [dzdx.getXY(x, y), dzdy.getXY(x, y)];
                // slope.push(Math.atan(util.distance(gx, gy)) / cellSize) // radians
                slope.push(Math.atan(util.distance(0, 0, gx, gy)) / cellSize);
                // if (noNaNs)
                //   while (gx === gy) {
                //     gx += util.randomNormal(0, 0.0001)
                //     gy += util.randomNormal(0, 0.0001)
                //   }
                // radians in [-PI,PI], downhill
                // let rad = (gx === gy && gy === 0) ? NaN : Math.atan2(-gy, -gx)
                let rad = Math.atan2(-gy, -gx);
                // positive radians in [0,2PI] if desired
                if (posAngle && rad < 0) rad += 2 * Math.PI;
                aspect.push(rad);
            }
        }
        slope = new DataSet(w, h, slope);
        aspect = new DataSet(w, h, aspect);
        return { slope, aspect, dzdx, dzdy }
    }

    // REMIND: limit to data that can be 24 bit. Error otherwise.
    // DataType of Int8, 16, Int24 OK, others need testing.
    // Possibly use precision to minimize byte size to 3, rgb?
    //
    // Convert dataset to an image context object.
    //
    // This can be used to "visualize" the data by normalizing
    // which will scale the data to use the entire RGB space.
    // It can also be used to create tiles or image-as-data if
    // the defaults are used.
    //
    // Due to
    // [alpha-premultiply](https://en.wikipedia.org/wiki/Alpha_compositing),
    // the best we can do as data is 24 bit ints.
    // You can simulate floats/fixed by multiplying the dataset
    // the dividing on conversion back.
    //
    // Our preferred transport is in the works, likely in the
    // tile datasets via blobs or arraybuffers. Sigh.
    // toContext (normalize = false, gray = false, alpha = 255) {
    //   const [w, h, data] = [this.width, this.height, this.data]
    //   let idata
    //   if (normalize) {
    //     idata = gray
    //       ? util.normalize8(data) : util.normalizeInt(data, 0, Math.pow(2, 24) - 1)
    //   } else {
    //     idata = data.map((a) => Math.round(a))
    //   }
    //   const ctx = util.createCtx(w, h)
    //   const id = ctx.getImageData(0, 0, w, h)
    //   const ta = id.data // ta short for typed array
    //   for (let i = 0; i < idata.length; i++) {
    //     const [num, j] = [idata[i], 4 * i] // j = byte index into ta
    //     if (gray) {
    //       ta[j] = ta[j + 1] = ta[j + 2] = Math.floor(num); ta[j + 3] = alpha
    //     } else {
    //       ta[j] = (num >> 16) & 0xff
    //       ta[j + 1] = (num >> 8) & 0xff
    //       ta[j + 2] = num & 0xff
    //       ta[j + 3] = alpha // if not 255, image will be premultiplied.
    //     }
    //   }
    //   ctx.putImageData(id, 0, 0)
    //   return ctx
    // }
    //
    // // Convert dataset to a canvas, which can be used as an image
    // toCanvas (normalize = false, gray = false, alpha = 255) {
    //   return this.toContext(gray, normalize, alpha).canvas
    // }
    // // Convert dataset to a base64 string
    // toDataUrl (normalize = false, gray = false, alpha = 255) {
    //   return util.ctxToDataUrl(this.toContext(gray, normalize, alpha))
    // }

    // Return max/min of data
    max() {
        return util.arrayMax(this.data)
    }
    min() {
        return util.arrayMin(this.data)
    }
    // Test that this has same width, height, data as dataset.
    // Note: does not require equal array type (Array or TypedArray)
    equals(dataset) {
        return (
            this.width === dataset.width &&
            this.height === dataset.height &&
            util.arraysEqual(this.data, dataset.data)
        )
    }
}

// import Color from './Color.js'

// Class Link instances form a link between two turtles, forming a graph.
// Flyweight object creation, see Patch/Patches.
// https://medium.com/dailyjs/two-headed-es6-classes-fe369c50b24

class Link {
    // The core default variables needed by a Link.
    // Use links.setDefault(name, val) to change
    // Modelers add additional "own variables" as needed.
    static defaultVariables() {
        // Core variables for patches. Not 'own' variables.
        return {
            end0: null, // Turtles: end0 & 1 are turtle ends of the link
            end1: null,
            width: 1, // THREE: must be 1. Canvas2D (unsupported) has widths.
        }
    }
    // Initialize a Link
    constructor() {
        Object.assign(this, Link.defaultVariables());
    }
    init(from, to) {
        this.end0 = from;
        this.end1 = to;
        from.links.push(this);
        to.links.push(this);
    }
    // Remove this link from its agentset
    die() {
        this.agentSet.removeAgent(this);
        util.removeArrayItem(this.end0.links, this);
        util.removeArrayItem(this.end1.links, this);
        // Set id to -1, indicates that I've died.
        this.id = -1;
    }

    bothEnds() {
        return [this.end0, this.end1]
    }
    length() {
        return this.end0.distance(this.end1)
    }
    otherEnd(turtle) {
        if (turtle === this.end0) return this.end1
        if (turtle === this.end1) return this.end0
        throw Error(`Link.otherEnd: turtle not a link turtle: ${turtle}`)
    }

    get x0() {
        return this.end0.x
    }
    get y0() {
        return this.end0.y
    }
    get z0() {
        return this.end0.z ? this.end0.z : 0 // REMIND: move to turtles
    }
    get x1() {
        return this.end1.x
    }
    get y1() {
        return this.end1.y
    }
    get z1() {
        return this.end1.z ? this.end1.z : 0
    }
}

// Links are a collection of all the Link objects between turtles.
class Links extends AgentSet {
    // Use AgentSeet ctor: constructor (model, AgentClass, name)

    // Factory: Add 1 or more links from the from turtle to the to turtle(s) which
    // can be a single turtle or an array of turtles. The optional init
    // proc is called on the new link after inserting in the agentSet.
    createOne(from, to, initFcn) {
        const link = this.addAgent();
        link.init(from, to);
        initFcn(link);
        return link
    }
    create(from, to, initFcn = link => {}) {
        if (!Array.isArray(to)) return this.createOne(from, to, initFcn)
        // if (!Array.isArray(to)) to = [to]
        // Return array of new links. REMIND: should be agentarray?
        return to.map(t => {
            // REMIND: skip dups
            // const link = this.addAgent()
            // link.init(from, t)
            // initFcn(link)
            // return link
            return this.createOne(from, t, initFcn)
        }) // REMIND: return single link if to not an array?
    }
}

// class World defines the coordinate system for the model.
// It will be upgraded with methods converting from other
// transforms like GIS and DataSets.

class World {
    static defaultOptions(maxX = 16, maxY = maxX) {
        return {
            minX: -maxX,
            maxX: maxX,
            minY: -maxY,
            maxY: maxY,
        }
    }
    static defaultWorld(maxX = 16, maxY = maxX) {
        return new World(World.defaultOptions(maxX, maxY))
    }
    // Initialize the world w/ defaults overridden w/ options.
    constructor(options = {}) {
        Object.assign(this, World.defaultOptions()); // initial this w/ defaults
        Object.assign(this, options); // override defaults with options
        this.setWorld();
    }
    // Complete properties derived from minX/Y, maxX/Y (patchSize === 1)
    setWorld() {
        this.numX = this.width = this.maxX - this.minX + 1;
        this.numY = this.height = this.maxY - this.minY + 1;
        this.minXcor = this.minX - 0.5;
        this.maxXcor = this.maxX + 0.5;
        this.minYcor = this.minY - 0.5;
        this.maxYcor = this.maxY + 0.5;
        // The midpoints of the world, in world coords.
        // (0, 0) for the centered default worlds. REMIND: remove?
        this.centerX = (this.minX + this.maxX) / 2;
        this.centerY = (this.minY + this.maxY) / 2;
        this.numPatches = this.width * this.height;
    }
    randomPosition(float = true) {
        return float
            ? [
                util.randomFloat2(this.minXcor, this.maxXcor),
                util.randomFloat2(this.minYcor, this.maxYcor),
            ]
            : [
                util.randomInt2(this.minX, this.maxX),
                util.randomInt2(this.minY, this.maxY),
            ]
    }
    // Test x,y for being on-world.
    isOnWorld(x, y) {
        return (
            this.minXcor <= x &&
            x <= this.maxXcor &&
            this.minYcor <= y &&
            y <= this.maxYcor
        )
    }

    bboxTransform(topLeft, bottomRight) {
        return new BBoxTransform(topLeft, bottomRight, this)
    }

    // ### Following use PatchSize

    // Get the world size in pixels. PatchSize is optional, defalting to 1
    getWorldSize(patchSize = 1) {
        return [this.numX * patchSize, this.numY * patchSize]
    }

    // Convert a canvas context to world euclidean coordinates
    // Change the ctx.canvas size, determined by patchSize.
    setCtxTransform(ctx, patchSize) {
        ctx.canvas.width = this.numX * patchSize;
        ctx.canvas.height = this.numY * patchSize;
        ctx.restore(); // close earlier save(). OK if no save called yet.
        ctx.save();
        ctx.scale(patchSize, -patchSize);
        ctx.translate(-this.minXcor, -this.maxYcor);
    }

    // Convert pixel location (top/left offset i.e. mouse) to patch coords (float)
    pixelXYtoPatchXY(x, y, patchSize) {
        return [this.minXcor + x / patchSize, this.maxYcor - y / patchSize]
    }
    // Convert patch coords (float) to pixel location (top/left offset i.e. mouse)
    patchXYtoPixelXY(x, y, patchSize) {
        return [(x - this.minXcor) * patchSize, (this.maxYcor - y) * patchSize]
    }
    // Change canvas size to this world's size.
    // Does not change size if already the same, preserving the ctx content.
    setCanvasSize(canvas, patchSize) {
        const [width, height] = this.getWorldSize(patchSize);
        util.setCanvasSize(canvas, width, height);
    }
}

class BBoxTransform {
    constructor(topLeft, bottomRight, world) {
        // const [topX, topY] = topLeft
        // const [botX, botY] = bottomRight
        let [topX, topY] = topLeft;
        let [botX, botY] = bottomRight;

        if (topX < botX) console.log('flipX');
        if (topY < botY) console.log('flipY');

        if (topX < botX) [topX, botX] = [botX, topX];
        if (topY < botY) [topY, botY] = [botY, topY];
        const { maxXcor, maxYcor, minXcor, minYcor } = world;

        // console.log('topX, botX:', topX, botX)
        // console.log('topY, botY', topY, botY)

        const mx = (topX - botX) / (maxXcor - minXcor);
        const my = (topY - botY) / (maxYcor - minYcor);

        const bx = (topX + botX - mx * (maxXcor + minXcor)) / 2;
        const by = (topY + botY - my * (maxYcor + minYcor)) / 2;

        Object.assign(this, { mx, my, bx, by });
    }
    toWorld(tlbrPoint) {
        const { mx, my, bx, by } = this;
        const [tlbrX, tlbrY] = tlbrPoint;
        const x = (tlbrX - bx) / mx;
        const y = (tlbrY - by) / my;
        return [x, y]
    }
    toBBox(worldPoint) {
        const { mx, my, bx, by } = this;
        const [worldX, worldY] = worldPoint;
        const x = mx * worldX + bx;
        const y = my * worldY + by;
        return [x, y]
    }
}



// The midpoints of the world, in world coords.
// (0, 0) for the centered default worlds. REMIND: remove?
// this.centerX = (this.minX + this.maxX) / 2
// this.centerY = (this.minY + this.maxY) / 2

// Calculate patchSize from canvas (any imagable) dimensions
// canvasPatchSize(canvas) {
//     // const [width, height] = canvas
//     return canvas.width / this.numX
// }
// canvasSize(patchSize) {
//     return [this.numX * patchSize, this.numY * patchSize]
// }

// Patches are the world other agentsets live on. They create a coord system
// from Model's world values: minX, maxX, minY, maxY
class Patches extends AgentSet {
    constructor(model, AgentClass, name) {
        // AgentSet sets these variables:
        // model, name, baseSet, world: model.world, agentProto: new AgentClass
        // REMIND: agentProto: defaults, agentSet, world, [name]=agentSet.baseSet
        super(model, AgentClass, name);

        // Skip if a breedSet (don't rebuild patches!).
        if (this.isBreedSet()) return

        this.populate();
        // this.setPixels()
        this.labels = []; // sparse array for labels
    }
    // Set up all the patches.
    populate() {
        util.repeat(this.model.world.numX * this.model.world.numY, i => {
            this.addAgent(); // Object.create(this.agentProto))
        });
    }

    setDefault(name, value) {
        if (name === 'color') {
            this.ask(p => {
                p.setColor(value);
            });
            util.logOnce(
                'patches.setDefault(color, value): color default not supported. Clearing to value'
            );
        } else {
            super.setDefault(name, value);
        }
    }
    // Get/Set label. REMIND: not implemented.
    // Set removes label if label is null or undefined.
    // Get returns undefined if no label.
    setLabel(patch, label) {
        // REMIND: does this work for breeds?
        // null or undefined
        if (label == null) {
            delete this.labels[patch.id];
        } else {
            this.labels[patch.id] = label;
        }
    }
    getLabel(patch) {
        return this.labels[patch.id]
    }

    // Return the offsets from a patch for its 8 element neighbors.
    // Specialized to be faster than inRect below.
    neighborsOffsets(x, y) {
        const { minX, maxX, minY, maxY, numX } = this.model.world;
        if (x === minX) {
            if (y === minY) return [-numX, -numX + 1, 1]
            if (y === maxY) return [1, numX + 1, numX]
            return [-numX, -numX + 1, 1, numX + 1, numX]
        }
        if (x === maxX) {
            if (y === minY) return [-numX - 1, -numX, -1]
            if (y === maxY) return [numX, numX - 1, -1]
            return [-numX - 1, -numX, numX, numX - 1, -1]
        }
        if (y === minY) return [-numX - 1, -numX, -numX + 1, 1, -1]
        if (y === maxY) return [1, numX + 1, numX, numX - 1, -1]
        return [-numX - 1, -numX, -numX + 1, 1, numX + 1, numX, numX - 1, -1]
    }
    // Return the offsets from a patch for its 4 element neighbors (N,S,E,W)
    neighbors4Offsets(x, y) {
        const numX = this.model.world.numX;
        return this.neighborsOffsets(x, y).filter(
            n => Math.abs(n) === 1 || Math.abs(n) === numX
        ) // slightly faster
        // .filter((n) => [1, -1, numX, -numX].indexOf(n) >= 0)
        // .filter((n) => [1, -1, numX, -numX].includes(n)) // slower than indexOf
    }
    // Return my 8 patch neighbors
    neighbors(patch) {
        const { id, x, y } = patch;
        const offsets = this.neighborsOffsets(x, y);
        const as = new AgentArray(offsets.length);
        offsets.forEach((o, i) => {
            as[i] = this[o + id];
        });
        return as
    }
    // Return my 4 patch neighbors
    neighbors4(patch) {
        const { id, x, y } = patch;
        const offsets = this.neighbors4Offsets(x, y);
        const as = new AgentArray(offsets.length);
        offsets.forEach((o, i) => {
            as[i] = this[o + id];
        });
        return as
    }

    // Return a random valid int x,y point in patch space
    randomPt() {
        const { minX, maxX, minY, maxY } = this.model.world;
        return [util.randomInt2(minX, maxX), util.randomInt2(minY, maxY)]
    }

    // Import/export DataSet to/from patch variable `patchVar`.
    // `useNearest`: true for fast rounding to nearest; false for bi-linear.
    importDataSet(dataSet, patchVar, useNearest = false) {
        if (this.isBreedSet()) {
            // REMIND: error
            util.warn('Patches: exportDataSet called with breed, using patches');
            this.baseSet.importDataSet(dataSet, patchVar, useNearest);
            return
        }
        const { numX, numY } = this.model.world;
        const dataset = dataSet.resample(numX, numY, useNearest);
        this.ask(p => {
            p[patchVar] = dataset.data[p.id];
        });
    }
    exportDataSet(patchVar, Type = Array) {
        if (this.isBreedSet()) {
            util.warn('Patches: exportDataSet called with breed, using patches');
            return this.baseSet.exportDataSet(patchVar, Type)
        }
        const { numX, numY } = this.model.world;
        // let data = util.arrayProps(this, patchVar)
        let data = this.props(patchVar);
        data = util.convertArray(data, Type);
        return new DataSet(numX, numY, data)
    }

    // Return id/index given valid x,y integers
    patchIndex(x, y) {
        const { minX, maxY, numX } = this.model.world;
        return x - minX + numX * (maxY - y)
    }

    // Return patch at x,y float values
    // Return undefined if off-world
    patch(x, y) {
        if (!this.model.world.isOnWorld(x, y)) return undefined
        const intX =
            x === this.model.world.maxXcor
                ? this.model.world.maxX
                : Math.round(x); // handle n.5 round up to n + 1
        const intY =
            y === this.model.world.maxYcor
                ? this.model.world.maxY
                : Math.round(y);
        return this.patchXY(intX, intY)
    }
    // Return the patch at x,y where both are valid integer patch coordinates.
    patchXY(x, y) {
        return this[this.patchIndex(x, y)]
    }

    // Patches in rectangle dx, dy from p, dx, dy integers.
    // Both dx & dy are half width/height of rect
    patchRect(p, dx, dy = dx, meToo = true) {
        // Return cached rect if one exists.
        if (p.rectCache) {
            const index = this.cacheIndex(dx, dy, meToo);
            const rect = p.rectCache[index];
            if (rect) return rect
        }
        const rect = new AgentArray();
        let { minX, maxX, minY, maxY } = this.model.world;
        minX = Math.max(minX, p.x - dx);
        maxX = Math.min(maxX, p.x + dx);
        minY = Math.max(minY, p.y - dy);
        maxY = Math.min(maxY, p.y + dy);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const pnext = this.patchXY(x, y);
                if (p !== pnext || meToo) rect.push(pnext);
            }
        }
        return rect
    }
    // Return patchRect given legal x, y values
    patchRectXY(x, y, dx, dy = dx, meToo = true) {
        return this.patchRect(this.patch(x, y), dx, dy, meToo)
    }

    // Performance: create a cached rect of this size in sparse array.
    // Index of cached rect is dx * dy + meToo ? 0 : -1.
    // This works for edge rects that are not that full size.
    // patchRect will use this if matches dx, dy, meToo.
    cacheIndex(dx, dy = dx, meToo = true) {
        return (2 * dx + 1) * (2 * dy + 1) + (meToo ? 0 : -1)
    }
    cacheRect(dx, dy = dx, meToo = true, clear = true) {
        const index = this.cacheIndex(dx, dy, meToo);
        this.ask(p => {
            if (!p.rectCache || clear) p.rectCache = [];
            const rect = this.inRect(p, dx, dy, meToo);
            p.rectCache[index] = rect;
        });
    }

    // Return patches within the patch rect, dx, dy integers
    // default is square & meToo
    inRect(patch, dx, dy = dx, meToo = true) {
        const pRect = this.patchRect(patch, dx, dy, meToo);
        if (this.isBaseSet()) return pRect
        return pRect.withBreed(this)
    }
    // Return patches within float radius distance of patch
    inRadius(patch, radius, meToo = true) {
        const dxy = Math.ceil(radius);
        const pRect = this.inRect(patch, dxy, dxy, meToo);
        return pRect.inRadius(patch, radius, meToo)
    }
    // Patches in cone from p in direction `angle`,
    // with `coneAngle` and float `radius`
    inCone(patch, radius, coneAngle, direction, meToo = true) {
        const dxy = Math.ceil(radius);
        const pRect = this.inRect(patch, dxy, dxy, meToo);
        return pRect.inCone(patch, radius, coneAngle, direction, meToo)
    }

    // Return patch at distance and angle from obj's (patch or turtle)
    // x, y (floats). If off world, return undefined.
    // To use heading: patchAtAngleAndDistance(obj, util.angle(heading), distance)
    // Does not take into account the angle of the obj .. turtle.theta for example.
    patchAtAngleAndDistance(obj, angle, distance) {
        let { x, y } = obj;
        x = x + distance * Math.cos(angle);
        y = y + distance * Math.sin(angle);
        return this.patch(x, y)
    }
    // patchLeftAndAhead (dTheta, distance) {
    //   return this.patchAtAngleAndDistance(dTheta, distance)
    // }
    // patchRightAndAhead (dTheta, distance) {
    //   return this.patchAtAngleAndDistance(-dTheta, distance)
    // }

    // Return true if patch on edge of world
    isOnEdge(patch) {
        const { x, y } = patch;
        const { minX, maxX, minY, maxY } = this.model.world;
        return x === minX || x === maxX || y === minY || y === maxY
    }
    // returns the edge patches for this breed.
    // generally called with patches.baseSet/model.patches.
    edgePatches() {
        return this.filter(p => this.isOnEdge(p))
    }

    // Diffuse the value of patch variable `p.v` by distributing `rate` percent
    // of each patch's value of `v` to its neighbors.
    // If the patch has less than 4/8 neighbors, return the extra to the patch.
    diffuse(v, rate) {
        this.diffuseN(8, v, rate);
    }
    diffuse4(v, rate) {
        this.diffuseN(4, v, rate);
    }
    diffuseN(n, v, rate) {
        // Note: for-of loops removed: chrome can't optimize them
        // test/apps/patches.js 22fps -> 60fps
        // zero temp variable if not yet set
        if (this[0]._diffuseNext === undefined) {
            // for (const p of this) p._diffuseNext = 0
            for (let i = 0; i < this.length; i++) this[i]._diffuseNext = 0;
        }

        // pass 1: calculate contribution of all patches to themselves and neighbors
        // for (const p of this) {
        for (let i = 0; i < this.length; i++) {
            const p = this[i];
            const dv = p[v] * rate;
            const dvn = dv / n;
            const neighbors = n === 8 ? p.neighbors : p.neighbors4;
            const nn = neighbors.length;
            p._diffuseNext += p[v] - dv + (n - nn) * dvn;
            // for (const n of neighbors) n._diffuseNext += dvn
            for (let i = 0; i < neighbors.length; i++) {
                neighbors[i]._diffuseNext += dvn;
            }
        }
        // pass 2: set new value for all patches, zero temp,
        // for (const p of this) {
        for (let i = 0; i < this.length; i++) {
            const p = this[i];
            p[v] = p._diffuseNext;
            p._diffuseNext = 0;
        }
    }
}

// Class Patch instances represent a rectangle on a grid.  They hold variables
// that are in the patches the turtles live on.  The set of all patches
// is the world on which the turtles live and the model runs.

// Flyweight object creation:
// Objects within AgentSets use "prototypal inheritance" via Object.create().
// Here, the Patch class is given to Patches for use creating Proto objects
// (new Patch(agentSet)), but only once per model/breed.
// The flyweight Patch objects are created via Object.create(protoObject),
// This lets the new Patch(agentset) object be "defaults".
// https://medium.com/dailyjs/two-headed-es6-classes-fe369c50b24
class Patch {
    static defaultVariables() {
        // Core variables for patches.
        return {
            turtles: undefined, // the turtles on me. Lazy evalued, see turtlesHere
        }
    }
    // Initialize a Patch given its Patches AgentSet.
    constructor() {
        Object.assign(this, Patch.defaultVariables());
    }
    // Getter for x,y derived from patch id, thus no setter.
    get x() {
        return this.id % this.model.world.numX + this.model.world.minX
    }
    get y() {
        return (
            this.model.world.maxY - Math.floor(this.id / this.model.world.numX)
        )
    }
    isOnEdge() {
        return this.patches.isOnEdge(this)
    }

    // Getter for neighbors of this patch.
    // Uses lazy evaluation to promote neighbors to instance variables.
    // To avoid promotion, use `patches.neighbors(this)`.
    // Promotion makes getters accessed only once.
    // defineProperty required: can't set this.neighbors when getter defined.
    get neighbors() {
        // lazy promote neighbors from getter to instance prop.
        const n = this.patches.neighbors(this);
        Object.defineProperty(this, 'neighbors', { value: n, enumerable: true });
        return n
    }
    get neighbors4() {
        const n = this.patches.neighbors4(this);
        Object.defineProperty(this, 'neighbors4', {
            value: n,
            enumerable: true,
        });
        return n
    }

    // Promote this.turtles on first call to turtlesHere.
    turtlesHere() {
        if (this.turtles == null) {
            this.patches.ask(p => {
                p.turtles = [];
            });
            this.model.turtles.ask(t => {
                t.patch.turtles.push(t);
            });
        }
        return this.turtles
    }
    // Returns above but returning only turtles of this breed.
    breedsHere(breed) {
        const turtles = this.turtlesHere();
        return turtles.withBreed(breed)
    }

    // 6 methods in both Patch & Turtle modules
    // Distance from me to x, y. REMIND: No off-world test done
    distanceXY(x, y) {
        return util.distance(this.x, this.y, x, y)
    }
    // Return distance from me to object having an x,y pair (turtle, patch, ...)
    distance(agent) {
        return this.distanceXY(agent.x, agent.y)
    }
    // Return angle towards agent/x,y
    // Use util.heading to convert to heading
    towards(agent) {
        return this.towardsXY(agent.x, agent.y)
    }
    towardsXY(x, y) {
        return util.radiansToward(this.x, this.y, x, y)
    }
    // Return patch w/ given parameters. Return undefined if off-world.
    // Return patch dx, dy from my position.
    patchAt(dx, dy) {
        return this.patches.patch(this.x + dx, this.y + dy)
    }
    patchAtAngleAndDistance(direction, distance) {
        return this.patches.patchAtAngleAndDistance(this, direction, distance)
    }

    sprout(num = 1, breed = this.model.turtles, initFcn = turtle => {}) {
        return breed.create(num, turtle => {
            turtle.setxy(this.x, this.y);
            initFcn(turtle);
        })
    }
}

// Turtles are the world other agentsets live on. They create a coord system
// from Model's world values: size, minX, maxX, minY, maxY
class Turtles extends AgentSet {
    // Use AgentSet ctr: constructor (model, AgentClass, name)
    createOne(initFcn) {
        const turtle = this.addAgent();
        turtle.theta = util.randomFloat(Math.PI * 2);
        initFcn(turtle);
        return turtle
    }
    create(num = 1, initFcn = turtle => {}) {
        if (num === 1) return this.createOne(initFcn)
        return util.repeat(num, (i, a) => {
            const turtle = this.addAgent();
            turtle.theta = util.randomFloat(Math.PI * 2);
            initFcn(turtle);
            // Return array of new agents. REMIND: should be agentarray?
            a.push(turtle);
        })
    }

    // Return a random valid float x,y point in turtle coord space.
    randomPt() {
        const { minXcor, maxXcor, minYcor, maxYcor } = this.model.world;
        return [
            util.randomFloat2(minXcor, maxXcor),
            util.randomFloat2(minYcor, maxYcor),
        ]
    }

    // Return an array of this breed within the array of patchs
    inPatches(patches) {
        let array = new AgentArray(); // []
        for (const p of patches) array.push(...p.turtlesHere());
        // REMIND: can't use withBreed .. its not an AgentSet. Move to AgentArray?
        if (this.isBreedSet()) array = array.filter(a => a.agentSet === this);
        return array
    }
    // Return an array of turtles/breeds within the patchRect, dx/y integers
    // Note: will return turtle too. Also slightly inaccurate due to being
    // patch based, not turtle based.
    inPatchRect(turtle, dx, dy = dx, meToo = false) {
        // meToo: true for patches, could have several turtles on patch
        const patches = this.model.patches.inRect(turtle.patch, dx, dy, true);
        const agents = this.inPatches(patches);
        // don't use agents.removeAgent: breeds
        if (!meToo) util.removeArrayItem(agents, turtle);
        // if (!meToo) util.removeItem(agents, turtle)
        return agents // this.inPatches(patches)
    }
    // Return the members of this agentset that are within radius distance
    // from me, using a patch rect.
    inRadius(turtle, radius, meToo = false) {
        const agents = this.inPatchRect(turtle, radius, radius, true);
        return agents.inRadius(turtle, radius, meToo)
    }
    inCone(turtle, radius, coneAngle, meToo = false) {
        const agents = this.inPatchRect(turtle, radius, radius, true);
        return agents.inCone(turtle, radius, coneAngle, turtle.theta, meToo)
    }

    // Circle Layout: position the turtles in this breed in an equally
    // spaced circle of the given radius, with the initial turtle
    // at the given start angle (default to pi/2 or "up") and in the
    // +1 or -1 direction (counter clockwise or clockwise)
    // defaulting to -1 (clockwise).
    layoutCircle(
        radius,
        center = [0, 0],
        startAngle = Math.PI / 2,
        direction = -1
    ) {
        const dTheta = (2 * Math.PI) / this.length;
        const [x0, y0] = center;
        this.ask((turtle, i) => {
            turtle.setxy(x0, y0);
            turtle.theta = startAngle + direction * dTheta * i;
            turtle.forward(radius);
        });
    }
}

// import Color from './Color.js'
// Flyweight object creation, see Patch/Patches.

// Class Turtle instances represent the dynamic, behavioral element of modeling.
// Each turtle knows the patch it is on, and interacts with that and other
// patches, as well as other turtles.

class Turtle {
    static defaultVariables() {
        return {
            // Core variables for turtles.
            // turtle's position: x, y, z.
            // Generally z set to constant via turtles.setDefault('z', num)
            x: 0,
            y: 0,
            z: 0,
            // my euclidean direction, radians from x axis, counter-clockwise
            theta: 0,
            // What to do if I wander off world. Can be 'clamp', 'wrap'
            // 'bounce', or a function, see handleEdge() method
            atEdge: 'clamp',
        }
    }
    // Initialize a Turtle given its Turtles AgentSet.
    constructor() {
        Object.assign(this, Turtle.defaultVariables());
    }
    die() {
        this.agentSet.removeAgent(this); // remove me from my baseSet and breed
        // Remove my links if any exist.
        // Careful: don't promote links
        if (this.hasOwnProperty('links')) {
            while (this.links.length > 0) this.links[0].die();
        }
        // Remove me from patch.turtles cache if patch.turtles array exists
        if (this.patch.turtles != null) {
            util.removeArrayItem(this.patch.turtles, this);
        }
        // Set id to -1, indicates that I've died.
        this.id = -1;
    }

    // Factory: create num new turtles at this turtle's location. The optional init
    // proc is called on the new turtle after inserting in its agentSet.
    hatch(num = 1, breed = this.agentSet, init = turtle => {}) {
        return breed.create(num, turtle => {
            turtle.setxy(this.x, this.y);
            // hatched turtle inherits parents' ownVariables
            for (const key of breed.ownVariables) {
                if (turtle[key] == null) turtle[key] = this[key];
            }
            init(turtle);
        })
    }
    // Getter for links for this turtle. REMIND: use new AgentSet(0)?
    // Uses lazy evaluation to promote links to instance variables.
    // REMIND: Let links create the array as needed, less "tricky"
    get links() {
        // lazy promote links from getter to instance prop.
        Object.defineProperty(this, 'links', {
            value: new AgentArray(0),
            enumerable: true,
        });
        return this.links
    }
    // Getter for the patch I'm on. Return null if off-world.
    get patch() {
        return this.model.patches.patch(this.x, this.y)
    }

    // Heading vs Euclidean Angles. Direction for clarity when ambiguity.
    get heading() {
        return util.heading(this.theta)
    }
    set heading(heading) {
        this.theta = util.angle(heading);
    }
    get direction() {
        return this.theta
    }
    set direction(theta) {
        this.theta = theta;
    }

    // Set x, y position. If z given, override default z.
    // Call handleEdge(x, y) if x, y off-world.
    setxy(x, y, z = null) {
        const p0 = this.patch;
        if (z != null) this.z = z; // don't promote z if null, use default z instead.
        if (this.model.world.isOnWorld(x, y) || this.atEdge === 'OK') {
            this.x = x;
            this.y = y;
        } else {
            this.handleEdge(x, y);
        }
        const p = this.patch;
        if (p && p.turtles != null && p !== p0) {
            // util.removeItem(p0.turtles, this)
            if (p0) util.removeArrayItem(p0.turtles, this);
            p.turtles.push(this);
        }
    }
    // Handle turtle if x,y off-world
    handleEdge(x, y) {
        if (util.isString(this.atEdge)) {
            const { minXcor, maxXcor, minYcor, maxYcor } = this.model.world;
            if (this.atEdge === 'wrap') {
                this.x = util.wrap(x, minXcor, maxXcor);
                this.y = util.wrap(y, minYcor, maxYcor);
            } else if (this.atEdge === 'clamp' || this.atEdge === 'bounce') {
                this.x = util.clamp(x, minXcor, maxXcor);
                this.y = util.clamp(y, minYcor, maxYcor);
                if (this.atEdge === 'bounce') {
                    if (this.x === minXcor || this.x === maxXcor) {
                        this.theta = Math.PI - this.theta;
                    } else {
                        this.theta = -this.theta;
                    }
                }
            } else {
                throw Error(`turtle.handleEdge: bad atEdge: ${this.atEdge}`)
            }
        } else {
            this.atEdge(this);
        }
    }
    // Place the turtle at the given patch/turtle location
    moveTo(agent) {
        this.setxy(agent.x, agent.y);
    }
    // Move forward (along theta) d units (patch coords),
    forward(d) {
        this.setxy(
            this.x + d * Math.cos(this.theta),
            this.y + d * Math.sin(this.theta)
        );
    }
    // Change current direction by rad radians which can be + (left) or - (right).
    rotate(rad) {
        this.theta = util.mod(this.theta + rad, Math.PI * 2);
    }
    right(rad) {
        this.rotate(-rad);
    }
    left(rad) {
        this.rotate(rad);
    }

    // Set my direction towards turtle/patch or x,y.
    // "direction" is euclidean radians.
    face(agent) {
        this.theta = this.towards(agent);
    }
    faceXY(x, y) {
        this.theta = this.towardsXY(x, y);
    }

    // Return the patch ahead of this turtle by distance (patchSize units).
    // Return undefined if off-world.
    patchAhead(distance) {
        return this.patchAtAngleAndDistance(this.theta, distance)
    }
    // Use patchAhead to determine if this turtle can move forward by distance.
    canMove(distance) {
        return this.patchAhead(distance) != null
    } // null / undefined
    patchLeftAndAhead(angle, distance) {
        return this.patchAtAngleAndDistance(angle + this.theta, distance)
    }
    patchRightAndAhead(angle, distance) {
        return this.patchAtAngleAndDistance(angle - this.theta, distance)
    }

    // 6 methods in both Patch & Turtle modules
    // Distance from me to x, y. REMIND: No off-world test done
    distanceXY(x, y) {
        return util.distance(this.x, this.y, x, y)
    }
    // Return distance from me to object having an x,y pair (turtle, patch, ...)
    // distance (agent) { this.distanceXY(agent.x, agent.y) }
    distance(agent) {
        return util.distance(this.x, this.y, agent.x, agent.y)
    }
    // Return angle towards agent/x,y
    // Use util.heading to convert to heading
    towards(agent) {
        return this.towardsXY(agent.x, agent.y)
    }
    towardsXY(x, y) {
        return util.radiansToward(this.x, this.y, x, y)
    }
    // Return patch w/ given parameters. Return undefined if off-world.
    // Return patch dx, dy from my position.
    patchAt(dx, dy) {
        return this.model.patches.patch(this.x + dx, this.y + dy)
    }
    // Note: angle is absolute, w/o regard to existing angle of turtle.
    // Use Left/Right versions for angle-relative.
    patchAtAngleAndDistance(direction, distance) {
        return this.model.patches.patchAtAngleAndDistance(
            this,
            direction,
            distance
        )
    }

    // Link methods. Note: this.links returns all links linked to me.
    // See links getter above.

    // Return other end of link from me. Link must include me!
    otherEnd(l) {
        return l.end0 === this ? l.end1 : l.end0
    }
    // Return all turtles linked to me
    linkNeighbors() {
        return this.links.map(l => this.otherEnd(l))
    }
}

// Class Model is the primary interface for modelers, integrating
// all the parts of a model. It also contains NetLogo's `observer` methods.
class Model {
    // Static class method for default setting.
    // Default world is centered, min/max = 16
    // static defaultWorld(maxX = 16, maxY = maxX) {
    //     return World.defaultOptions(maxX, maxY)
    // }
    // static defaultWorldOptions(maxX = 16, maxY = maxX) {
    //     return World.defaultOptions(maxX, maxY)
    // }
    static defaultWorld(maxX = 16, maxY = maxX) {
        return new World(World.defaultOptions(maxX, maxY))
    }

    // The Model constructor takes a World object.
    constructor(worldOptions = Model.defaultWorld()) {
        this.worldOptions = worldOptions;
        this.resetModel(); // REMIND: Temporary. Inline?
    }
    initAgentSet(name, AgentsetClass, AgentClass) {
        const agentset = new AgentsetClass(this, AgentClass, name);
        this[name] = agentset;
    }
    resetModel() {
        this.ticks = 0;
        this.world = new World(this.worldOptions);
        // Base AgentSets setup here. Breeds handled by setup
        this.initAgentSet('patches', Patches, Patch);
        this.initAgentSet('turtles', Turtles, Turtle);
        this.initAgentSet('links', Links, Link);
    }
    reset() {
        this.resetModel();
    }
    tick() {
        this.ticks++;
    }

    // ### User Model Creation

    // A user's model is made by subclassing Model and over-riding these
    // 2 abstract methods. `super` need not be called.

    setup() {} // Your initialization code goes here
    // Update/step your model here
    step() {} // called each step of the model

    // Breeds: create breeds/subarrays of Patches, Agents, Links
    patchBreeds(breedNames) {
        for (const breedName of breedNames.split(' ')) {
            this[breedName] = this.patches.newBreed(breedName);
        }
    }
    turtleBreeds(breedNames) {
        for (const breedName of breedNames.split(' ')) {
            this[breedName] = this.turtles.newBreed(breedName);
        }
    }
    linkBreeds(breedNames) {
        for (const breedName of breedNames.split(' ')) {
            this[breedName] = this.links.newBreed(breedName);
        }
    }
}

// Based on the mapbox elevation formula:
// https://blog.mapbox.com/global-elevation-data-6689f1d0ba65

class RGBDataSet extends DataSet {
    static scaleFromMinMax(min, max) {
        // 255*256*256 + 255*256 + 255 === 2 ** 24 - 1 i.e. 16777215
        return (max - min) / (2 ** 24 - 1)
    }

    constructor(img, min = 0, scale = 1, ArrayType = Float32Array) {
        super(img.width, img.height, new ArrayType(img.width * img.height));
        const ctx = util.createCtx(img.width, img.height);
        util.fillCtxWithImage(ctx, img);
        const imgData = util.ctxImageData(ctx);
        const convertedData = this.data;
        for (var i = 0; i < convertedData.length; i++) {
            const r = imgData.data[4 * i];
            const g = imgData.data[4 * i + 1];
            const b = imgData.data[4 * i + 2];
            convertedData[i] = min + (r * 256 * 256 + g * 256 + b) * scale;
        }
        // this.src = img.src // Might be useful? Flags as image data set.
    }
}

// ### Sugar functions for running models:

function testStartup(toWindowObj) {
    util.toWindow(toWindowObj);
    const usingPuppeteer = navigator.userAgent === 'Puppeteer';
    if (usingPuppeteer) util.randomSeed();
}

function testSetup(model) {
    const { world, patches, turtles, links } = model;
    util.printToPage('patches: ' + patches.length);
    util.printToPage('turtles: ' + turtles.length);
    util.printToPage('links: ' + links.length);
    const breeds = Object.assign({}, turtles.breeds, patches.breeds);
    util.forEach(breeds, (val, key) => {
        util.printToPage(key + ': ' + val.length);
    });
    util.toWindow({ world, patches, turtles, links, model });
}

function testDone(model, propsNames = []) {
    const usingPuppeteer = navigator.userAgent === 'Puppeteer';
    util.printToPage('');
    util.printToPage('Done:');
    propsNames.forEach(name => {
        let val = model[name];
        if (util.isArray(val)) val = val.length;
        if (util.isFunction(val)) val = model[name]();
        util.printToPage(`${name}: ${val}`);
    });
    // util.printToPage('')
    util.printToPage(modelIO.sampleObj(model));

    if (usingPuppeteer) {
        window.modelDone = model.modelDone = true;
        window.modelSample = model.modelSample = modelIO.sampleJSON(model);
    }
}

// ### Utilities

function toJSON(obj, indent = 0, topLevelArrayOK = true) {
    let firstCall = topLevelArrayOK;
    const blackList = ['rectCache'];
    const json = JSON.stringify(
        obj,
        (key, val) => {
            if (blackList.includes(key)) return undefined
            const isAgentArray =
                Array.isArray(val) &&
                val.length > 0 &&
                Number.isInteger(val[0].id);

            if (isAgentArray && !firstCall) {
                return val.map(v => v.id)
            }

            firstCall = false;
            return val
        },
        indent
    );
    return json
}

function sampleObj(model) {
    const obj = {
        model: Object.keys(model),
        patches: model.patches.length,
        patch: model.patches.oneOf(),
        turtles: model.turtles.length,
        turtle: model.turtles.oneOf(),
        links: model.links.length,
        link: model.links.oneOf(),
    };
    const json = toJSON(obj);
    return JSON.parse(json)
}

function sampleJSON(model, indent = 0) {
    return toJSON(sampleObj(model), indent)
}

// Print a message to an html element.
// If msg is an object, convert to JSON.
// export function printToPage(msg, element = document.body) {
//     if (util.isObject(msg)) {
//         msg = JSON.stringify(msg, null, 2)
//         msg = '<pre>' + msg + '</pre>'
//     }

//     element.style.fontFamily = 'monospace'
//     element.innerHTML += msg + '<br />'
// }


var modelIO$1 = Object.freeze({
	testStartup: testStartup,
	testSetup: testSetup,
	testDone: testDone,
	toJSON: toJSON,
	sampleObj: sampleObj,
	sampleJSON: sampleJSON
});

// This is the importer/exporter of all our modules.
// It is only used by Rollup for bundling.

exports.AgentArray = AgentArray;
exports.AgentSet = AgentSet;
exports.DataSet = DataSet;
exports.Link = Link;
exports.Links = Links;
exports.Model = Model;
exports.Patch = Patch;
exports.Patches = Patches;
exports.RGBDataSet = RGBDataSet;
exports.Turtle = Turtle;
exports.Turtles = Turtles;
exports.World = World;
exports.modelIO = modelIO$1;
exports.util = util;

Object.defineProperty(exports, '__esModule', { value: true });

})));
