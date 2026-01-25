/**
 * Security Utilities for HD Ticket Desk
 *
 * Contains helper functions for input sanitization, validation,
 * and security-related operations.
 */

import * as crypto from 'crypto';

/**
 * Timing-safe string comparison to prevent timing attacks
 * Used for comparing OTPs, tokens, and other sensitive values
 */
export function timingSafeCompare(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Sanitize string input - removes potential XSS vectors
 * Use for user-generated content that will be displayed
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();
}

/**
 * Sanitize HTML content - more aggressive sanitization
 * Use for any content that might contain HTML
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove style tags
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  // Basic email sanitization - lowercase and trim
  const sanitized = email.toLowerCase().trim();
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }
  return sanitized;
}

/**
 * Validate UUID format (for IDs)
 * Prevents injection through ID parameters
 */
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate CUID format (Prisma default IDs)
 */
export function isValidCuid(id: string | null | undefined): boolean {
  if (!id) return false;
  // CUID format: starts with 'c', 25 characters total, alphanumeric
  const cuidRegex = /^c[a-z0-9]{24}$/;
  return cuidRegex.test(id);
}

/**
 * Generate cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate cryptographically secure OTP
 */
export function generateSecureOtp(digits: number = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Hash sensitive data for logging (show only last 4 characters)
 */
export function maskSensitiveData(data: string | null | undefined): string {
  if (!data || data.length < 4) return '****';
  return '****' + data.slice(-4);
}

/**
 * Validate password strength
 * Returns true if password meets minimum requirements
 */
export function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

/**
 * Rate limit key generator for user-specific rate limiting
 */
export function generateRateLimitKey(prefix: string, identifier: string): string {
  return `ratelimit:${prefix}:${identifier}`;
}

/**
 * Sanitize filename for uploads
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Remove consecutive dots
    .substring(0, 255); // Limit length
}
