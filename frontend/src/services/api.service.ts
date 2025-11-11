import {
  ConnectionConfig,
  TestConnectionResponse,
  SchemaMetadata,
  CompareResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ApiService {
  async testConnection(config: ConnectionConfig): Promise<TestConnectionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to test connection');
    }

    return response.json();
  }

  async listDatabases(config: ConnectionConfig): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/api/list-databases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list databases');
    }

    const data = await response.json();
    return data.databases;
  }

  async inspectSchema(config: ConnectionConfig, database: string): Promise<SchemaMetadata> {
    const response = await fetch(`${API_BASE_URL}/api/inspect-schema`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conn: config, database }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to inspect schema');
    }

    return response.json();
  }

  async compare(
    primarySchema: SchemaMetadata,
    secondarySchema: SchemaMetadata,
    includeDrops = false
  ): Promise<CompareResponse> {
    const response = await fetch(`${API_BASE_URL}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primarySchemaJson: primarySchema,
        secondarySchemaJson: secondarySchema,
        options: { includeDrops },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to compare schemas');
    }

    return response.json();
  }
}

export const apiService = new ApiService();
