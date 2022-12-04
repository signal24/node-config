"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const fs_1 = require("fs");
const file = (0, fs_1.readFileSync)(__dirname + '/../tests/fixtures/0.env.in');
console.log((0, dotenv_1.parse)(file));
