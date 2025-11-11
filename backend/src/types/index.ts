export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  ssl?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

export interface TestConnectionResponse {
  ok: boolean;
  serverVersion?: string;
  flavor?: 'mysql' | 'mariadb';
  error?: string;
}

export interface ListDatabasesResponse {
  databases: string[];
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

export interface PrimaryKeyMetadata {
  columns: string[];
}

export interface UniqueKeyMetadata {
  columns: string[];
}

export interface IndexMetadata {
  columns: string[];
  nonUnique: boolean;
  type?: 'BTREE' | 'FULLTEXT' | 'HASH';
}

export interface ForeignKeyMetadata {
  columns: string[];
  refTable: string;
  refColumns: string[];
  onUpdate?: string;
  onDelete?: string;
}

export interface CheckConstraintMetadata {
  expr: string;
}

export interface TableOptions {
  rowFormat?: string;
  comment?: string;
}

export interface TableMetadata {
  engine: string;
  charset?: string;
  collation?: string;
  columns: Record<string, ColumnMetadata>;
  primaryKey?: PrimaryKeyMetadata;
  uniqueKeys: Record<string, UniqueKeyMetadata>;
  indexes: Record<string, IndexMetadata>;
  foreignKeys: Record<string, ForeignKeyMetadata>;
  checks?: Record<string, CheckConstraintMetadata>;
  options?: TableOptions;
}

export interface ViewMetadata {
  definer?: string;
  definition: string;
}

export interface TriggerMetadata {
  timing: 'BEFORE' | 'AFTER';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  statement: string;
}

export interface SchemaMetadata {
  server: {
    version: string;
    flavor: 'mysql' | 'mariadb';
  };
  schema: {
    tables: Record<string, TableMetadata>;
    views: Record<string, ViewMetadata>;
    triggers?: Record<string, TriggerMetadata>;
  };
}

export interface InspectSchemaRequest {
  conn: ConnectionConfig;
  database: string;
}

export interface ColumnDiff {
  add?: Record<string, ColumnMetadata>;
  drop?: Record<string, ColumnMetadata>;
  modify?: Record<string, {
    from: ColumnMetadata;
    to: ColumnMetadata;
  }>;
}

export interface PrimaryKeyDiff {
  add?: PrimaryKeyMetadata;
  drop?: PrimaryKeyMetadata;
  change?: {
    from: PrimaryKeyMetadata;
    to: PrimaryKeyMetadata;
  };
}

export interface KeysDiff {
  add?: Record<string, UniqueKeyMetadata | IndexMetadata | ForeignKeyMetadata>;
  drop?: Record<string, UniqueKeyMetadata | IndexMetadata | ForeignKeyMetadata>;
}

export interface OptionsDiff {
  engineChanged?: { from: string; to: string };
  charsetChanged?: { from?: string; to?: string };
  collationChanged?: { from?: string; to?: string };
  rowFormatChanged?: { from?: string; to?: string };
}

export interface TableDiff {
  columns?: ColumnDiff;
  pk?: PrimaryKeyDiff;
  uniques?: KeysDiff;
  indexes?: KeysDiff;
  fks?: KeysDiff;
  options?: OptionsDiff;
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

export interface DiffSummary {
  newTables: number;
  missingTables: number;
  changedTables: number;
  newViews: number;
  missingViews: number;
}

export interface CompareRequest {
  primarySchemaJson: SchemaMetadata;
  secondarySchemaJson: SchemaMetadata;
  options?: {
    includeDrops?: boolean;
  };
}

export interface CompareResponse {
  summary: DiffSummary;
  diff: DiffResult;
  script: string;
}
