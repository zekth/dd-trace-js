'use strict';

const env = require('./env');
const load = require('./load');
const context = require('./context');
const msgpack = require('./msgpack');
const service = require('./service');
const dateNow = require('./date_now');
const crypto = require('./crypto');
const now = require('performance-now');
const Uint32Array = global.Uint32Array || require('typedarray').Uint32Array;
const Promise = global.Promise || require('es6-promise');
const Long = require('long');
const loadNs = now();
const loadMs = dateNow();

module.exports = {
    name: () => 'browser',
    version: () => navigator.userAgent,
    engine: () => 'browser',
    env,
    load,
    context,
    msgpack,
    service,

    now() {
        return Math.round((loadMs + now() - loadNs) * 100000) / 100000;
    },

    id() {
        const array = new Uint32Array(2);
        crypto.getRandomValues(array);

        return new Long(array[0], array[1], true);
    },

    request(options) {
        options = Object.assign(
            {
                headers: {}
            },
            options
        );

        return new Promise((resolve, reject) => {
            const xhr = new global.XMLHttpRequest();
            const paramsString = options.params === undefined ? '' :
                `?${Object.entries(options.params).map(([k, v]) => `${k}=${v}`).join('&')}`
            const url = `${options.protocol}//${options.hostname}:${
                options.port
            }${options.path}${paramsString}`;

            xhr.onload = function() {
                if (this.status >= 200 && this.status <= 299) {
                    resolve();
                }
            };

            xhr.onerror = () => reject(new TypeError('Network request failed'));
            xhr.ontimeout = () =>
                reject(new TypeError('Network request failed'));

            xhr.open(options.method, url, true);

            Object.keys(options.headers).forEach(name => {
                xhr.setRequestHeader(name, options.headers[name]);
            });

            xhr.send(options.data);
        });
    }
};
