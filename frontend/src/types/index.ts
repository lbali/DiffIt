export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  ssl?: {
    rejectUnauthorized?: boolean;
  };
}

export interface TestConnectionResponse {
  ok: boolean;
  serverVersion?: string;
  flavor?: 'mysql' | 'mariadb';
  error?: string;
}

export interface ColumnMetadata {
  ordinal: number;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  extra: string;
  columnType: string;
  charset?: string;
  collation?: string;
}

export interface TableMetadata {
  engine: string;
  charset?: string;
  collation?: string;
  columns: Record<string, ColumnMetadata>;
  primaryKey?: { columns: string[] };
  uniqueKeys: Record<string, { columns: string[] }>;
  indexes: Record<string, { columns: string[]; nonUnique: boolean; type?: string }>;
  foreignKeys: Record<
    string,
    {
      columns: string[];
      refTable: string;
      refColumns: string[];
      onUpdate?: string;
      onDelete?: string;
    }
  >;
  checks?: Record<string, { expr: string }>;
  options?: {
    rowFormat?: string;
    comment?: string;
  };
}

export interface SchemaMetadata {
  server: {
    version: string;
    flavor: 'mysql' | 'mariadb';
  };
  schema: {
    tables: Record<string, TableMetadata>;
    views: Record<string, { definer?: string; definition: string }>;
    triggers?: Record<
      string,
      {
        timing: 'BEFORE' | 'AFTER';
        event: 'INSERT' | 'UPDATE' | 'DELETE';
        statement: string;
      }
    >;
  };
}

export interface DiffSummary {
  newTables: number;
  missingTables: number;
  changedTables: number;
  newViews: number;
  missingViews: number;
}

export interface ColumnDiff {
  add?: Record<string, ColumnMetadata>;
  drop?: Record<string, ColumnMetadata>;
  modify?: Record<
    string,
    {
      from: ColumnMetadata;
      to: ColumnMetadata;
    }
  >;
}

export interface TableDiff {
  columns?: ColumnDiff;
  pk?: {
    add?: { columns: string[] };
    drop?: { columns: string[] };
    change?: {
      from: { columns: string[] };
      to: { columns: string[] };
    };
  };
  uniques?: {
    add?: Record<string, { columns: string[] }>;
    drop?: Record<string, { columns: string[] }>;
  };
  indexes?: {
    add?: Record<string, { columns: string[]; nonUnique: boolean; type?: string }>;
    drop?: Record<string, { columns: string[]; nonUnique: boolean; type?: string }>;
  };
  fks?: {
    add?: Record<
      string,
      {
        columns: string[];
        refTable: string;
        refColumns: string[];
        onUpdate?: string;
        onDelete?: string;
      }
    >;
    drop?: Record<
      string,
      {
        columns: string[];
        refTable: string;
        refColumns: string[];
        onUpdate?: string;
        onDelete?: string;
      }
    >;
  };
  options?: {
    engineChanged?: { from: string; to: string };
    charsetChanged?: { from?: string; to?: string };
    collationChanged?: { from?: string; to?: string };
    rowFormatChanged?: { from?: string; to?: string };
  };
}

export interface DiffResult {
  onlyInPrimary: {
    tables: string[];
    views: string[];
  };
  onlyInSecondary: {
    tables: string[];
    views: string[];
  };
  changed: Record<string, TableDiff>;
}

export interface CompareResponse {
  summary: DiffSummary;
  diff: DiffResult;
  script: string;
}
