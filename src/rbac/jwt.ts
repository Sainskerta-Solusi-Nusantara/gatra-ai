// Minimal HS256 JWT — no dependency. Sufficient for first-party WA-auth tokens.

import crypto from 'node:crypto';

interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export interface JwtClaims {
  sub: string; // user id
  wa: string;
  dept: string | null;
  jab: string;
  iat: number;
  exp: number;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): Buffer {
  const pad = (4 - (s.length % 4)) % 4;
  const norm = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return Buffer.from(norm, 'base64');
}

function hmac(secret: string, data: string): Buffer {
  return crypto.createHmac('sha256', secret).update(data).digest();
}

export function signJwt(
  payload: Omit<JwtClaims, 'iat' | 'exp'>,
  secret: string,
  expiresInSec: number,
): string {
  if (!secret) throw new Error('JWT secret not configured');
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const claims: JwtClaims = { ...payload, iat: nowSec, exp: nowSec + expiresInSec };
  const headerB = b64url(Buffer.from(JSON.stringify(header)));
  const payloadB = b64url(Buffer.from(JSON.stringify(claims)));
  const signingInput = `${headerB}.${payloadB}`;
  const sig = b64url(hmac(secret, signingInput));
  return `${signingInput}.${sig}`;
}

export function verifyJwt(token: string, secret: string): JwtClaims | null {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB, payloadB, sigB] = parts;
  const signingInput = `${headerB}.${payloadB}`;
  const expected = hmac(secret, signingInput);
  let provided: Buffer;
  try {
    provided = b64urlDecode(sigB);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  let claims: JwtClaims;
  try {
    claims = JSON.parse(b64urlDecode(payloadB).toString('utf8')) as JwtClaims;
  } catch {
    return null;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp < nowSec) return null;
  return claims;
}
