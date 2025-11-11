import {
  SchemaMetadata,
  TableMetadata,
  ColumnMetadata,
  DiffResult,
  DiffSummary,
  TableDiff,
  CompareResponse,
} from '../types';

export class DiffService {
  compare(
    primarySchema: SchemaMetadata,
    secondarySchema: SchemaMetadata,
    options?: { includeDrops?: boolean }
  ): CompareResponse {
    const diff = this.calculateDiff(primarySchema, secondarySchema);
    const summary = this.calculateSummary(diff);
    const script = this.generateScript(primarySchema, secondarySchema, diff, options?.includeDrops ?? false);

    return { summary, diff, script };
  }

  private calculateDiff(primary: SchemaMetadata, secondary: SchemaMetadata): DiffResult {
    const primaryTables = Object.keys(primary.schema.tables);
    const secondaryTables = Object.keys(secondary.schema.tables);

    const onlyInPrimary = primaryTables.filter((t) => !secondaryTables.includes(t));
    const onlyInSecondary = secondaryTables.filter((t) => !primaryTables.includes(t));
    const commonTables = primaryTables.filter((t) => secondaryTables.includes(t));

    const primaryViews = Object.keys(primary.schema.views);
    const secondaryViews = Object.keys(secondary.schema.views);
    const onlyInPrimaryViews = primaryViews.filter((v) => !secondaryViews.includes(v));
    const onlyInSecondaryViews = secondaryViews.filter((v) => !primaryViews.includes(v));

    const changed: Record<string, TableDiff> = {};

    for (const tableName of commonTables) {
      const primaryTable = primary.schema.tables[tableName];
      const secondaryTable = secondary.schema.tables[tableName];
      const tableDiff = this.compareTable(primaryTable, secondaryTable);

      if (Object.keys(tableDiff).length > 0) {
        changed[tableName] = tableDiff;
      }
    }

    return {
      onlyInPrimary: { tables: onlyInPrimary, views: onlyInPrimaryViews },
      onlyInSecondary: { tables: onlyInSecondary, views: onlyInSecondaryViews },
      changed,
    };
  }

  private compareTable(primary: TableMetadata, secondary: TableMetadata): TableDiff {
    const diff: TableDiff = {};

    // Compare columns
    const columnDiff = this.compareColumns(primary.columns, secondary.columns);
    if (columnDiff) diff.columns = columnDiff;

    // Compare primary key
    const pkDiff = this.comparePrimaryKey(primary.primaryKey, secondary.primaryKey);
    if (pkDiff) diff.pk = pkDiff;

    // Compare unique keys
    const uniquesDiff = this.compareKeys(primary.uniqueKeys, secondary.uniqueKeys);
    if (uniquesDiff) diff.uniques = uniquesDiff;

    // Compare indexes
    const indexesDiff = this.compareKeys(primary.indexes, secondary.indexes);
    if (indexesDiff) diff.indexes = indexesDiff;

    // Compare foreign keys
    const fksDiff = this.compareForeignKeys(primary.foreignKeys, secondary.foreignKeys);
    if (fksDiff) diff.fks = fksDiff;

    // Compare table options
    const optionsDiff = this.compareOptions(primary, secondary);
    if (optionsDiff) diff.options = optionsDiff;

    return diff;
  }

  private compareColumns(primary: Record<string, ColumnMetadata>, secondary: Record<string, ColumnMetadata>) {
    const primaryCols = Object.keys(primary);
    const secondaryCols = Object.keys(secondary);

    const add = primaryCols.filter((c) => !secondaryCols.includes(c));
    const drop = secondaryCols.filter((c) => !primaryCols.includes(c));
    const common = primaryCols.filter((c) => secondaryCols.includes(c));

    const modify: Record<string, { from: ColumnMetadata; to: ColumnMetadata }> = {};

    for (const colName of common) {
      const primaryCol = primary[colName];
      const secondaryCol = secondary[colName];

      if (!this.areColumnsEqual(primaryCol, secondaryCol)) {
        modify[colName] = { from: secondaryCol, to: primaryCol };
      }
    }

    if (add.length === 0 && drop.length === 0 && Object.keys(modify).length === 0) {
      return undefined;
    }

    return {
      add: add.length > 0 ? Object.fromEntries(add.map((c) => [c, primary[c]])) : undefined,
      drop: drop.length > 0 ? Object.fromEntries(drop.map((c) => [c, secondary[c]])) : undefined,
      modify: Object.keys(modify).length > 0 ? modify : undefined,
    };
  }

  private areColumnsEqual(col1: ColumnMetadata, col2: ColumnMetadata): boolean {
    return (
      col1.dataType === col2.dataType &&
      col1.isNullable === col2.isNullable &&
      col1.columnDefault === col2.columnDefault &&
      col1.extra === col2.extra &&
      col1.charset === col2.charset &&
      col1.collation === col2.collation
    );
  }

  private comparePrimaryKey(
    primary?: { columns: string[] },
    secondary?: { columns: string[] }
  ) {
    if (!primary && !secondary) return undefined;
    if (primary && !secondary) return { add: primary };
    if (!primary && secondary) return { drop: secondary };

    const equal = JSON.stringify(primary!.columns) === JSON.stringify(secondary!.columns);
    if (equal) return undefined;

    return { change: { from: secondary!, to: primary! } };
  }

  private compareKeys(primary: Record<string, any>, secondary: Record<string, any>) {
    const primaryKeys = Object.keys(primary);
    const secondaryKeys = Object.keys(secondary);

    const add = primaryKeys.filter((k) => !secondaryKeys.includes(k));
    const drop = secondaryKeys.filter((k) => !primaryKeys.includes(k));

    if (add.length === 0 && drop.length === 0) return undefined;

    return {
      add: add.length > 0 ? Object.fromEntries(add.map((k) => [k, primary[k]])) : undefined,
      drop: drop.length > 0 ? Object.fromEntries(drop.map((k) => [k, secondary[k]])) : undefined,
    };
  }

  private compareForeignKeys(primary: Record<string, any>, secondary: Record<string, any>) {
    return this.compareKeys(primary, secondary);
  }

  private compareOptions(primary: TableMetadata, secondary: TableMetadata) {
    const diff: any = {};

    if (primary.engine !== secondary.engine) {
      diff.engineChanged = { from: secondary.engine, to: primary.engine };
    }

    if (primary.charset !== secondary.charset) {
      diff.charsetChanged = { from: secondary.charset, to: primary.charset };
    }

    if (primary.collation !== secondary.collation) {
      diff.collationChanged = { from: secondary.collation, to: primary.collation };
    }

    if (primary.options?.rowFormat !== secondary.options?.rowFormat) {
      diff.rowFormatChanged = { from: secondary.options?.rowFormat, to: primary.options?.rowFormat };
    }

    return Object.keys(diff).length > 0 ? diff : undefined;
  }

  private calculateSummary(diff: DiffResult): DiffSummary {
    return {
      newTables: diff.onlyInPrimary.tables.length,
      missingTables: diff.onlyInSecondary.tables.length,
      changedTables: Object.keys(diff.changed).length,
      newViews: diff.onlyInPrimary.views.length,
      missingViews: diff.onlyInSecondary.views.length,
    };
  }

  private generateScript(
    primary: SchemaMetadata,
    secondary: SchemaMetadata,
    diff: DiffResult,
    includeDrops: boolean
  ): string {
    const lines: string[] = [];

    lines.push('-- DB Schema Diff: Migration Script');
    lines.push('-- This script will update Secondary schema to match Primary schema');
    lines.push('-- Generated: ' + new Date().toISOString());
    lines.push('');
    lines.push('SET FOREIGN_KEY_CHECKS=0;');
    lines.push('');

    // Drop tables only in secondary (if includeDrops)
    if (includeDrops && diff.onlyInSecondary.tables.length > 0) {
      lines.push('-- Drop tables that exist only in Secondary');
      for (const tableName of diff.onlyInSecondary.tables) {
        lines.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);
      }
      lines.push('');
    }

    // Create new tables
    if (diff.onlyInPrimary.tables.length > 0) {
      lines.push('-- Create new tables from Primary');
      for (const tableName of diff.onlyInPrimary.tables) {
        const table = primary.schema.tables[tableName];
        lines.push(this.generateCreateTable(tableName, table));
        lines.push('');
      }
    }

    // Alter existing tables
    if (Object.keys(diff.changed).length > 0) {
      lines.push('-- Alter existing tables');
      for (const [tableName, tableDiff] of Object.entries(diff.changed)) {
        const alterStatements = this.generateAlterTable(
          tableName,
          tableDiff,
          primary.schema.tables[tableName],
          secondary.schema.tables[tableName],
          includeDrops
        );
        if (alterStatements.length > 0) {
          lines.push(...alterStatements);
          lines.push('');
        }
      }
    }

    // Create views
    if (diff.onlyInPrimary.views.length > 0) {
      lines.push('-- Create views from Primary');
      for (const viewName of diff.onlyInPrimary.views) {
        const view = primary.schema.views[viewName];
        lines.push(`CREATE VIEW \`${viewName}\` AS ${view.definition};`);
      }
      lines.push('');
    }

    lines.push('SET FOREIGN_KEY_CHECKS=1;');

    return lines.join('\n');
  }

  private generateCreateTable(tableName: string, table: TableMetadata): string {
    const lines: string[] = [];
    lines.push(`CREATE TABLE \`${tableName}\` (`);

    const parts: string[] = [];

    // Columns
    for (const [colName, col] of Object.entries(table.columns)) {
      parts.push('  ' + this.generateColumnDefinition(colName, col));
    }

    // Primary key
    if (table.primaryKey) {
      const cols = table.primaryKey.columns.map((c) => `\`${c}\``).join(', ');
      parts.push(`  PRIMARY KEY (${cols})`);
    }

    // Unique keys
    for (const [keyName, key] of Object.entries(table.uniqueKeys)) {
      const cols = key.columns.map((c) => `\`${c}\``).join(', ');
      parts.push(`  UNIQUE KEY \`${keyName}\` (${cols})`);
    }

    // Indexes
    for (const [indexName, index] of Object.entries(table.indexes)) {
      const cols = index.columns.map((c) => `\`${c}\``).join(', ');
      const indexType = index.type && index.type !== 'BTREE' ? ` USING ${index.type}` : '';
      parts.push(`  KEY \`${indexName}\` (${cols})${indexType}`);
    }

    // Foreign keys
    for (const [fkName, fk] of Object.entries(table.foreignKeys)) {
      const cols = fk.columns.map((c) => `\`${c}\``).join(', ');
      const refCols = fk.refColumns.map((c) => `\`${c}\``).join(', ');
      let fkDef = `  CONSTRAINT \`${fkName}\` FOREIGN KEY (${cols}) REFERENCES \`${fk.refTable}\` (${refCols})`;
      if (fk.onDelete) fkDef += ` ON DELETE ${fk.onDelete}`;
      if (fk.onUpdate) fkDef += ` ON UPDATE ${fk.onUpdate}`;
      parts.push(fkDef);
    }

    lines.push(parts.join(',\n'));
    lines.push(`) ENGINE=${table.engine}`);

    if (table.charset) lines[lines.length - 1] += ` DEFAULT CHARSET=${table.charset}`;
    if (table.collation) lines[lines.length - 1] += ` COLLATE=${table.collation}`;
    if (table.options?.rowFormat) lines[lines.length - 1] += ` ROW_FORMAT=${table.options.rowFormat}`;
    if (table.options?.comment) lines[lines.length - 1] += ` COMMENT='${table.options.comment.replace(/'/g, "''")}'`;

    lines[lines.length - 1] += ';';

    return lines.join('\n');
  }

  private generateColumnDefinition(colName: string, col: ColumnMetadata): string {
    let def = `\`${colName}\` ${col.columnType.toUpperCase()}`;

    if (col.charset) def += ` CHARACTER SET ${col.charset}`;
    if (col.collation) def += ` COLLATE ${col.collation}`;

    def += col.isNullable ? ' NULL' : ' NOT NULL';

    // Clean columnDefault defensively (in case it wasn't cleaned at source)
    let cleanDefault = col.columnDefault;
    if (cleanDefault && typeof cleanDefault === 'string') {
      cleanDefault = cleanDefault.replace(/\s*DEFAULT_GENERATED\s*/gi, '').trim();
      if (cleanDefault === '') cleanDefault = null;
    }

    // Clean extra field to remove DEFAULT_GENERATED
    let cleanExtra = col.extra;
    if (cleanExtra && typeof cleanExtra === 'string') {
      cleanExtra = cleanExtra.replace(/\s*DEFAULT_GENERATED\s*/gi, '').trim();
    }

    // Don't add DEFAULT for TEXT/BLOB types, auto_increment, or MySQL internal values
    if (
      cleanDefault !== null &&
      !cleanExtra.toLowerCase().includes('auto_increment') &&
      !col.dataType.toLowerCase().includes('text') &&
      !col.dataType.toLowerCase().includes('blob')
    ) {
      if (cleanDefault === 'CURRENT_TIMESTAMP' || cleanDefault.startsWith('CURRENT_TIMESTAMP')) {
        def += ` DEFAULT ${cleanDefault}`;
      } else {
        def += ` DEFAULT '${cleanDefault.replace(/'/g, "''")}'`;
      }
    }

    if (cleanExtra) def += ` ${cleanExtra.toUpperCase()}`;

    return def;
  }

  private generateAlterTable(
    tableName: string,
    diff: TableDiff,
    primaryTable: TableMetadata,
    secondaryTable: TableMetadata,
    includeDrops: boolean
  ): string[] {
    const statements: string[] = [];

    // Drop foreign keys first
    if (includeDrops && diff.fks?.drop) {
      for (const fkName of Object.keys(diff.fks.drop)) {
        statements.push(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${fkName}\`;`);
      }
    }

    // Drop PRIMARY KEY if needed (before column modifications with AUTO_INCREMENT)
    if (diff.pk && (diff.pk.drop || diff.pk.change)) {
      statements.push(`ALTER TABLE \`${tableName}\` DROP PRIMARY KEY;`);
    }

    // Add PRIMARY KEY first (before AUTO_INCREMENT columns)
    if (diff.pk && (diff.pk.add || diff.pk.change)) {
      const pk = diff.pk.add || diff.pk.change!.to;
      const cols = pk.columns.map((c) => `\`${c}\``).join(', ');
      statements.push(`ALTER TABLE \`${tableName}\` ADD PRIMARY KEY (${cols});`);
    }

    // Now modify columns (AUTO_INCREMENT will work because PK is already there)
    if (diff.columns) {
      const alterParts: string[] = [];

      if (includeDrops && diff.columns.drop) {
        for (const colName of Object.keys(diff.columns.drop)) {
          alterParts.push(`DROP COLUMN \`${colName}\``);
        }
      }

      if (diff.columns.add) {
        const colOrder = Object.keys(primaryTable.columns);
        for (const colName of Object.keys(diff.columns.add)) {
          const col = diff.columns.add[colName];
          const idx = colOrder.indexOf(colName);
          let afterClause = '';
          if (idx > 0) {
            afterClause = ` AFTER \`${colOrder[idx - 1]}\``;
          } else {
            afterClause = ' FIRST';
          }
          alterParts.push(`ADD COLUMN ${this.generateColumnDefinition(colName, col)}${afterClause}`);
        }
      }

      if (diff.columns.modify) {
        for (const [colName, { to }] of Object.entries(diff.columns.modify)) {
          alterParts.push(`MODIFY COLUMN ${this.generateColumnDefinition(colName, to)}`);
        }
      }

      if (alterParts.length > 0) {
        statements.push(`ALTER TABLE \`${tableName}\`\n  ${alterParts.join(',\n  ')};`);
      }
    }

    // Unique keys
    if (diff.uniques) {
      if (includeDrops && diff.uniques.drop) {
        for (const keyName of Object.keys(diff.uniques.drop)) {
          statements.push(`ALTER TABLE \`${tableName}\` DROP KEY \`${keyName}\`;`);
        }
      }
      if (diff.uniques.add) {
        for (const [keyName, key] of Object.entries(diff.uniques.add)) {
          const cols = key.columns.map((c: string) => `\`${c}\``).join(', ');
          statements.push(`ALTER TABLE \`${tableName}\` ADD UNIQUE KEY \`${keyName}\` (${cols});`);
        }
      }
    }

    // Indexes
    if (diff.indexes) {
      if (includeDrops && diff.indexes.drop) {
        for (const indexName of Object.keys(diff.indexes.drop)) {
          statements.push(`ALTER TABLE \`${tableName}\` DROP KEY \`${indexName}\`;`);
        }
      }
      if (diff.indexes.add) {
        for (const [indexName, index] of Object.entries(diff.indexes.add)) {
          const cols = index.columns.map((c: string) => `\`${c}\``).join(', ');
          const indexType = index.type && index.type !== 'BTREE' ? ` USING ${index.type}` : '';
          statements.push(`ALTER TABLE \`${tableName}\` ADD KEY \`${indexName}\` (${cols})${indexType};`);
        }
      }
    }

    // Foreign keys
    if (diff.fks?.add) {
      for (const [fkName, fk] of Object.entries(diff.fks.add)) {
        const cols = fk.columns.map((c: string) => `\`${c}\``).join(', ');
        const refCols = fk.refColumns.map((c: string) => `\`${c}\``).join(', ');
        let stmt = `ALTER TABLE \`${tableName}\` ADD CONSTRAINT \`${fkName}\` FOREIGN KEY (${cols}) REFERENCES \`${fk.refTable}\` (${refCols})`;
        if (fk.onDelete) stmt += ` ON DELETE ${fk.onDelete}`;
        if (fk.onUpdate) stmt += ` ON UPDATE ${fk.onUpdate}`;
        statements.push(stmt + ';');
      }
    }

    // Table options
    if (diff.options) {
      const optionParts: string[] = [];
      if (diff.options.engineChanged) {
        optionParts.push(`ENGINE=${diff.options.engineChanged.to}`);
      }
      if (diff.options.charsetChanged) {
        optionParts.push(`DEFAULT CHARSET=${diff.options.charsetChanged.to}`);
      }
      if (diff.options.collationChanged) {
        optionParts.push(`COLLATE=${diff.options.collationChanged.to}`);
      }
      if (diff.options.rowFormatChanged) {
        optionParts.push(`ROW_FORMAT=${diff.options.rowFormatChanged.to}`);
      }

      if (optionParts.length > 0) {
        statements.push(`ALTER TABLE \`${tableName}\` ${optionParts.join(' ')};`);
      }
    }

    return statements;
  }
}
