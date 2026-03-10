import type { FastifyInstance } from 'fastify';

/**
 * Lightweight request/response observability.
 *
 * Logs a structured line per request with:
 *   reqId, method, route (pattern), statusCode, latencyMs
 *
 * Call with disableRequestLogging: true on the Fastify instance
 * to avoid duplicate logging from the built-in request lifecycle.
 */
export function registerObservability(app: FastifyInstance): void {
  app.addHook('onResponse', (request, reply, done) => {
    request.log.info({
      reqId: request.id,
      method: request.method,
      url: request.url,
      route: request.routeOptions?.url ?? request.url,
      statusCode: reply.statusCode,
      latencyMs: Math.round(reply.elapsedTime * 100) / 100
    }, 'req done');
    done();
  });
}
