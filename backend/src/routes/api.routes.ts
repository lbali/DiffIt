import { FastifyInstance } from 'fastify';
import { DatabaseService } from '../services/database.service';
import { DiffService } from '../services/diff.service';
import {
  ConnectionConfig,
  InspectSchemaRequest,
  CompareRequest,
} from '../types';

export async function apiRoutes(fastify: FastifyInstance) {
  const dbService = new DatabaseService();
  const diffService = new DiffService();

  // Test connection
  fastify.post<{ Body: ConnectionConfig }>('/api/test-connection', async (request, reply) => {
    try {
      const result = await dbService.testConnection(request.body);
      return result;
    } catch (error) {
      reply.status(500).send({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // List databases
  fastify.post<{ Body: ConnectionConfig }>('/api/list-databases', async (request, reply) => {
    try {
      const databases = await dbService.listDatabases(request.body);
      return { databases };
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Inspect schema
  fastify.post<{ Body: InspectSchemaRequest }>('/api/inspect-schema', async (request, reply) => {
    try {
      const { conn, database } = request.body;
      const schema = await dbService.inspectSchema(conn, database);
      return schema;
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Compare schemas
  fastify.post<{ Body: CompareRequest }>('/api/compare', async (request, reply) => {
    try {
      const { primarySchemaJson, secondarySchemaJson, options } = request.body;
      const result = diffService.compare(primarySchemaJson, secondarySchemaJson, options);
      return result;
    } catch (error) {
      reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Health check
  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
