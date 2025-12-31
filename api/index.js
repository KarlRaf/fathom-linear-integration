"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
// Vercel serverless function entry point
// This file re-exports the Express app for Vercel
var server_1 = require("../src/server");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(server_1).default; } });
//# sourceMappingURL=index.js.map