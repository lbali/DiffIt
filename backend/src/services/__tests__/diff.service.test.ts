import { describe, it, expect } from 'vitest';
import { DiffService } from '../diff.service';
import { SchemaMetadata } from '../../types';

describe('DiffService', () => {
  const diffService = new DiffService();

  const primarySchema: SchemaMetadata = {
    server: { version: '8.0.0', flavor: 'mysql' },
    schema: {
      tables: {
        users: {
          engine: 'InnoDB',
          charset: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci',
          columns: {
            id: {
              ordinal: 1,
              dataType: 'bigint unsigned',
              isNullable: false,
              columnDefault: null,
              extra: 'auto_increment',
              columnType: 'bigint(20) unsigned',
            },
            name: {
              ordinal: 2,
              dataType: 'varchar(255)',
              isNullable: false,
              columnDefault: null,
              extra: '',
              columnType: 'varchar(255)',
            },
          },
          primaryKey: { columns: ['id'] },
          uniqueKeys: {},
          indexes: {},
          foreignKeys: {},
        },
      },
      views: {},
    },
  };

  const secondarySchema: SchemaMetadata = {
    server: { version: '8.0.0', flavor: 'mysql' },
    schema: {
      tables: {
        users: {
          engine: 'InnoDB',
          charset: 'utf8mb4',
          collation: 'utf8mb4_unicode_ci',
          columns: {
            id: {
              ordinal: 1,
              dataType: 'bigint unsigned',
              isNullable: false,
              columnDefault: null,
              extra: 'auto_increment',
              columnType: 'bigint(20) unsigned',
            },
          },
          primaryKey: { columns: ['id'] },
          uniqueKeys: {},
          indexes: {},
          foreignKeys: {},
        },
      },
      views: {},
    },
  };

  it('should detect column additions', () => {
    const result = diffService.compare(primarySchema, secondarySchema);
    expect(result.summary.changedTables).toBe(1);
    expect(result.diff.changed.users?.columns?.add).toBeDefined();
    expect(result.diff.changed.users?.columns?.add?.name).toBeDefined();
  });

  it('should generate SQL script', () => {
    const result = diffService.compare(primarySchema, secondarySchema);
    expect(result.script).toContain('ALTER TABLE');
    expect(result.script).toContain('ADD COLUMN');
  });
});
