import type { FastifyRequest, FastifyReply } from 'fastify';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { config } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  if (!jwks && config.security.cfAccessEnabled) {
    const jwksUrl = new URL(
      '/cdn-cgi/access/certs',
      `https://${config.security.cfAccessTeamDomain}`
    );
    jwks = createRemoteJWKSet(jwksUrl);
  }
  return jwks;
}

async function verifyCloudflareAccessJwt(token: string): Promise<boolean> {
  const jwksSet = getJwks();
  if (!jwksSet) {
    return false;
  }

  try {
    await jwtVerify(token, jwksSet, {
      audience: config.security.cfAccessAudience,
      issuer: `https://${config.security.cfAccessTeamDomain}`,
    });
    return true;
  } catch {
    return false;
  }
}

export async function adminAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  // Development mode: check for dev admin token
  if (config.isDev && config.security.devAdminToken) {
    const devToken = request.headers['x-dev-admin-token'];
    if (devToken === config.security.devAdminToken) {
      return;
    }
  }

  // Production mode: verify Cloudflare Access JWT
  if (config.security.cfAccessEnabled) {
    const cfAuthHeader = request.headers['cf-access-jwt-assertion'];
    if (typeof cfAuthHeader === 'string') {
      const isValid = await verifyCloudflareAccessJwt(cfAuthHeader);
      if (isValid) {
        return;
      }
    }
  }

  // If neither check passed
  throw new UnauthorizedError('Invalid or missing admin authentication');
}
