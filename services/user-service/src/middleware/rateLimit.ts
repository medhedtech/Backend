import rateLimit from 'express-rate-limit';

export const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
export const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
export const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }); 