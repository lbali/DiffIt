import mysql, { Connection, RowDataPacket } from 'mysql2/promise';
import { ConnectionConfig, TestConnectionResponse, SchemaMetadata, TableMetadata, ColumnMetadata } from '../types';

export class DatabaseService {
  private async createConnection(config: ConnectionConfig): Promise<Connection> {
    return await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      connectTimeout: 10000,
    });
  }

  async testConnection(config: ConnectionConfig): Promise<TestConnectionResponse> {
    let connection: Connection | undefined;
    try {
      connection = await this.createConnection(config);

      const [rows] = await connection.query<RowDataPacket[]>('SELECT VERSION() as version');
      const version = rows[0]?.version || '';
      const flavor = version.toLowerCase().includes('mariadb') ? 'mariadb' : 'mysql';

      return {
        ok: true,
        serverVersion: version,
        flavor,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      await connection?.end();
    }
  }

  async listDatabases(config: ConnectionConfig): Promise<string[]> {
    let connection: Connection | undefined;
    try {
      connection = await this.createConnection(config);

      const [rows] = await connection.query<RowDataPacket[]>('SHOW DATABASES');

      return rows
        .map((row) => row.Database)
        .filter((db) => !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(db));
    } finally {
      await connection?.end();
    }
  }

  async inspectSchema(config: ConnectionConfig, database: string): Promise<SchemaMetadata> {
    let connection: Connection | undefined;
    try {
      connection = await this.createConnection(config);

      // Get server version
      const [versionRows] = await connection.query<RowDataPacket[]>('SELECT VERSION() as version');
      const version = versionRows[0]?.version || '';
      const flavor = version.toLowerCase().includes('mariadb') ? 'mariadb' : 'mysql';

      // Set schema stats expiry to 0 for MySQL 8+
      if (!version.toLowerCase().includes('mariadb') && parseInt(version.split('.')[0]) >= 8) {
        await connection.query('SET SESSION information_schema_stats_expiry=0');
      }

      await connection.query(`USE \`${database}\``);

      // Get all tables
      const tables = await this.getTables(connection, database);
      const views = await this.getViews(connection, database);
      const triggers = await this.getTriggers(connection, database);

      return {
        server: { version, flavor },
        schema: {
          tables,
          views,
          triggers,
        },
      };
    } finally {
      await connection?.end();
    }
  }

  private async getTables(connection: Connection, database: string): Promise<Record<string, TableMetadata>> {
    const [tableRows] = await connection.query<RowDataPacket[]>(
      `SELECT TABLE_NAME, ENGINE, TABLE_COLLATION, TABLE_COMMENT, ROW_FORMAT
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [database]
    );

    const tables: Record<string, TableMetadata> = {};

    for (const tableRow of tableRows) {
      const tableName = tableRow.TABLE_NAME;
      const charset = tableRow.TABLE_COLLATION ? tableRow.TABLE_COLLATION.split('_')[0] : undefined;

      const columns = await this.getColumns(connection, database, tableName);
      const primaryKey = await this.getPrimaryKey(connection, database, tableName);
      const uniqueKeys = await this.getUniqueKeys(connection, database, tableName);
      const indexes = await this.getIndexes(connection, database, tableName);
      const foreignKeys = await this.getForeignKeys(connection, database, tableName);
      const checks = await this.getCheckConstraints(connection, database, tableName);

      tables[tableName] = {
        engine: tableRow.ENGINE,
        charset,
        collation: tableRow.TABLE_COLLATION,
        columns,
        primaryKey,
        uniqueKeys,
        indexes,
        foreignKeys,
        checks,
        options: {
          rowFormat: tableRow.ROW_FORMAT,
          comment: tableRow.TABLE_COMMENT || undefined,
        },
      };
    }

    return tables;
  }

  private async getColumns(
    connection: Connection,
    database: string,
    tableName: string
  ): Promise<Record<string, ColumnMetadata>> {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        COLUMN_NAME, ORDINAL_POSITION, DATA_TYPE, COLUMN_TYPE,
        IS_NULLABLE, COLUMN_DEFAULT, EXTRA,
        CHARACTER_SET_NAME, COLLATION_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [database, tableName]
    );

    const columns: Record<string, ColumnMetadata> = {};

    for (const row of rows) {
      // Clean DEFAULT_GENERATED from COLUMN_DEFAULT (MySQL internal marker)
      let columnDefault = row.COLUMN_DEFAULT;
      if (columnDefault && typeof columnDefault === 'string') {
        // More aggressive cleaning - remove DEFAULT_GENERATED anywhere in the string
        columnDefault = columnDefault.replace(/\s*DEFAULT_GENERATED\s*/gi, '').trim();
        // If it becomes empty after cleaning, set to null
        if (columnDefault === '') columnDefault = null;
      }

      // Also clean EXTRA field which might contain DEFAULT_GENERATED
      let extra = row.EXTRA || '';
      if (extra && typeof extra === 'string') {
        extra = extra.replace(/\s*DEFAULT_GENERATED\s*/gi, '').trim();
      }

      columns[row.COLUMN_NAME] = {
        ordinal: row.ORDINAL_POSITION,
        dataType: this.normalizeDataType(row.COLUMN_TYPE),
        isNullable: row.IS_NULLABLE === 'YES',
        columnDefault: columnDefault,
        extra: extra,
        columnType: row.COLUMN_TYPE,
        charset: row.CHARACTER_SET_NAME,
        collation: row.COLLATION_NAME,
      };
    }

    return columns;
  }

  private normalizeDataType(columnType: string): string {
    // Return the full column type as normalized form
    return columnType.toLowerCase();
  }

  private async getPrimaryKey(
    connection: Connection,
    database: string,
    tableName: string
  ): Promise<{ columns: string[] } | undefined> {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
       ORDER BY ORDINAL_POSITION`,
      [database, tableName]
    );

    if (rows.length === 0) return undefined;

    return {
      columns: rows.map((row) => row.COLUMN_NAME),
    };
  }

  private async getUniqueKeys(
    connection: Connection,
    database: string,
    tableName: string
  ): Promise<Record<string, { columns: string[] }>> {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, ORDINAL_POSITION
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         AND CONSTRAINT_NAME != 'PRIMARY'
         AND CONSTRAINT_NAME IN (
           SELECT CONSTRAINT_NAME
           FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'UNIQUE'
         )
       ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION`,
      [database, tableName, database, tableName]
    );

    const uniques: Record<string, { columns: string[] }> = {};

    for (const row of rows) {
      if (!uniques[row.CONSTRAINT_NAME]) {
        uniques[row.CONSTRAINT_NAME] = { columns: [] };
      }
      uniques[row.CONSTRAINT_NAME].columns.push(row.COLUMN_NAME);
    }

    return uniques;
  }

  private async getIndexes(
    connection: Connection,
    database: string,
    tableName: string
  ): Promise<Record<string, { columns: string[]; nonUnique: boolean; type?: string }>> {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, INDEX_TYPE, SEQ_IN_INDEX
       FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         AND INDEX_NAME != 'PRIMARY'
         AND INDEX_NAME NOT IN (
           SELECT CONSTRAINT_NAME
           FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'UNIQUE'
         )
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      [database, tableName, database, tableName]
    );

    const indexes: Record<string, { columns: string[]; nonUnique: boolean; type?: string }> = {};

    for (const row of rows) {
      if (!indexes[row.INDEX_NAME]) {
        indexes[row.INDEX_NAME] = {
          columns: [],
          nonUnique: row.NON_UNIQUE === 1,
          type: row.INDEX_TYPE,
        };
      }
      indexes[row.INDEX_NAME].columns.push(row.COLUMN_NAME);
    }

    return indexes;
  }

  private async getForeignKeys(
    connection: Connection,
    database: string,
    tableName: string
  ): Promise<Record<string, { columns: string[]; refTable: string; refColumns: string[]; onUpdate?: string; onDelete?: string }>> {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        kcu.CONSTRAINT_NAME,
        kcu.COLUMN_NAME,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME,
        kcu.ORDINAL_POSITION,
        rc.UPDATE_RULE,
        rc.DELETE_RULE
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
       JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
         ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
         AND kcu.TABLE_SCHEMA = rc.CONSTRAINT_SCHEMA
       WHERE kcu.TABLE_SCHEMA = ? AND kcu.TABLE_NAME = ?
         AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
      [database, tableName]
    );

    const fks: Record<string, { columns: string[]; refTable: string; refColumns: string[]; onUpdate?: string; onDelete?: string }> = {};

    for (const row of rows) {
      if (!fks[row.CONSTRAINT_NAME]) {
        fks[row.CONSTRAINT_NAME] = {
          columns: [],
          refTable: row.REFERENCED_TABLE_NAME,
          refColumns: [],
          onUpdate: row.UPDATE_RULE,
          onDelete: row.DELETE_RULE,
        };
      }
      fks[row.CONSTRAINT_NAME].columns.push(row.COLUMN_NAME);
      fks[row.CONSTRAINT_NAME].refColumns.push(row.REFERENCED_COLUMN_NAME);
    }

    return fks;
  }

  private async getCheckConstraints(
    connection: Connection,
    database: string,
    tableName: string
  ): Promise<Record<string, { expr: string }>> {
    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT CONSTRAINT_NAME, CHECK_CLAUSE
         FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
         WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ?`,
        [database, tableName]
      );

      const checks: Record<string, { expr: string }> = {};
      for (const row of rows) {
        checks[row.CONSTRAINT_NAME] = { expr: row.CHECK_CLAUSE };
      }
      return checks;
    } catch {
      // CHECK_CONSTRAINTS might not exist in older versions
      return {};
    }
  }

  private async getViews(connection: Connection, database: string): Promise<Record<string, { definer?: string; definition: string }>> {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT TABLE_NAME, DEFINER, VIEW_DEFINITION
       FROM INFORMATION_SCHEMA.VIEWS
       WHERE TABLE_SCHEMA = ?`,
      [database]
    );

    const views: Record<string, { definer?: string; definition: string }> = {};
    for (const row of rows) {
      views[row.TABLE_NAME] = {
        definer: row.DEFINER,
        definition: row.VIEW_DEFINITION,
      };
    }
    return views;
  }

  private async getTriggers(connection: Connection, database: string): Promise<Record<string, { timing: 'BEFORE' | 'AFTER'; event: 'INSERT' | 'UPDATE' | 'DELETE'; statement: string }>> {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, ACTION_STATEMENT
       FROM INFORMATION_SCHEMA.TRIGGERS
       WHERE TRIGGER_SCHEMA = ?`,
      [database]
    );

    const triggers: Record<string, { timing: 'BEFORE' | 'AFTER'; event: 'INSERT' | 'UPDATE' | 'DELETE'; statement: string }> = {};
    for (const row of rows) {
      triggers[row.TRIGGER_NAME] = {
        timing: row.ACTION_TIMING,
        event: row.EVENT_MANIPULATION,
        statement: row.ACTION_STATEMENT,
      };
    }
    return triggers;
  }
}
