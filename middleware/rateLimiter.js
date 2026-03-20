import rateLimit from 'express-rate-limit';

// Rate limiter for login endpoint: 5 attempts per hour
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 300, // 5 attempts
  message: {
    error: 'Too many login attempts. Please try again in 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Apply only to /auth routes
  skipSuccessfulRequests: false,
});