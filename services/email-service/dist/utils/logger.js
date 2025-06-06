"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Simple logger for email service
 */
const logger = {
    info: (message, data) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
    },
    error: (message, data) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, data || '');
    },
    warn: (message, data) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
    },
    debug: (message, data) => {
        if (process.env.DEBUG === 'true') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
        }
    }
};
exports.default = logger;
