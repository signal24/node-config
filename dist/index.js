'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.loadConfig = exports.decryptConfig = void 0;
const dotenv_1 = require('dotenv');
const fs_1 = require('fs');
const crypto_1 = require('./crypto');
const reader_1 = require('./reader');
const types_1 = require('./types');
function decryptConfig(decryptor, data) {
    const decrypted = {};
    for (const [key, value] of Object.entries(data)) {
        decrypted[key] = decryptor.decryptValueIfEncrypted(value);
    }
    return decrypted;
}
exports.decryptConfig = decryptConfig;
function loadConfig(options) {
    options = { ...types_1.DefaultLoadOptions, ...options };
    const files = Array.isArray(options.file) ? options.file : [options.file];
    if (!options.key) {
        throw new Error('Decryption key is not set');
    }
    const decryptor = new crypto_1.Decryptor(options.key);
    const config = {};
    for (const file of files) {
        if ((0, fs_1.existsSync)(file)) {
            const decryptedContent = (0, reader_1.loadAndTransformContent)(file, data => decryptConfig(decryptor, data));
            const fileConfig = (0, dotenv_1.parse)(decryptedContent);
            Object.assign(config, fileConfig);
        }
    }
    Object.assign(config, process.env);
    return config;
}
exports.loadConfig = loadConfig;
