import { useState } from 'react';
import { CompareResponse, TableDiff } from '../types';

interface DiffResultsProps {
  result: CompareResponse;
}

export function DiffResults({ result }: DiffResultsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'tables' | 'script'>('overview');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const downloadScript = () => {
    const blob = new Blob([result.script], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema-migration-${new Date().toISOString().split('T')[0]}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyScript = async () => {
    await navigator.clipboard.writeText(result.script);
    alert('SQL kopyalandı!');
  };

  const renderTableDiff = (tableName: string, diff: TableDiff) => {
    return (
      <div className="space-y-4">
        {diff.columns && (
          <div>
            <h4 className="font-semibold text-lg mb-2">Kolonlar</h4>
            {diff.columns.add && (
              <div className="mb-2">
                <span className="text-green-700 font-medium">Eklenecek:</span>
                <ul className="list-disc list-inside ml-4">
                  {Object.keys(diff.columns.add).map((col) => (
                    <li key={col} className="text-green-600">
                      {col}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.columns.drop && (
              <div className="mb-2">
                <span className="text-red-700 font-medium">Silinecek:</span>
                <ul className="list-disc list-inside ml-4">
                  {Object.keys(diff.columns.drop).map((col) => (
                    <li key={col} className="text-red-600">
                      {col}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.columns.modify && (
              <div>
                <span className="text-orange-700 font-medium">Değiştirilecek:</span>
                <ul className="list-disc list-inside ml-4">
                  {Object.entries(diff.columns.modify).map(([col, change]) => (
                    <li key={col} className="text-orange-600">
                      {col}: {change.from.columnType} → {change.to.columnType}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {diff.pk && (
          <div>
            <h4 className="font-semibold text-lg mb-2">Primary Key</h4>
            {diff.pk.add && <p className="text-green-600">Eklenecek: {diff.pk.add.columns.join(', ')}</p>}
            {diff.pk.drop && <p className="text-red-600">Silinecek: {diff.pk.drop.columns.join(', ')}</p>}
            {diff.pk.change && (
              <p className="text-orange-600">
                Değişecek: {diff.pk.change.from.columns.join(', ')} → {diff.pk.change.to.columns.join(', ')}
              </p>
            )}
          </div>
        )}

        {diff.indexes && (
          <div>
            <h4 className="font-semibold text-lg mb-2">Index'ler</h4>
            {diff.indexes.add && (
              <div className="mb-2">
                <span className="text-green-700 font-medium">Eklenecek:</span>
                <ul className="list-disc list-inside ml-4">
                  {Object.entries(diff.indexes.add).map(([name, idx]) => (
                    <li key={name} className="text-green-600">
                      {name} ({idx.columns.join(', ')})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.indexes.drop && (
              <div>
                <span className="text-red-700 font-medium">Silinecek:</span>
                <ul className="list-disc list-inside ml-4">
                  {Object.keys(diff.indexes.drop).map((name) => (
                    <li key={name} className="text-red-600">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {diff.uniques && (
          <div>
            <h4 className="font-semibold text-lg mb-2">Unique Key'ler</h4>
            {diff.uniques.add && (
              <div className="mb-2">
                <span className="text-green-700 font-medium">Eklenecek:</span>
                <ul className="list-disc list-inside ml-4">
                  {Object.entries(diff.uniques.add).map(([name, uk]) => (
                    <li key={name} className="text-green-600">
                      {name} ({uk.columns.join(', ')})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.uniques.drop && (
              <div>
                <span className="text-red-700 font-medium">Silinecek:</span>
                <ul className="list-disc list-inside ml-4">
                  {Object.keys(diff.uniques.drop).map((name) => (
                    <li key={name} className="text-red-600">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {diff.fks && (
          <div>
            <h4 className="font-semibold text-lg mb-2">Foreign Key'ler</h4>
            {diff.fks.add && (
              <div className="mb-2">
                <span className="text-green-700 font-medium">Eklenecek:</span>
                <ul className="list-disc list-inside ml-4">
                  {Object.entries(diff.fks.add).map(([name, fk]) => (
                    <li key={name} className="text-green-600">
                      {name} ({fk.columns.join(', ')}) → {fk.refTable} ({fk.refColumns.join(', ')})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {diff.fks.drop && (
              <div>
                <span className="text-red-700 font-medium">Silinecek:</span>
                <ul className="list-disc list-inside ml-4">
                  {Object.keys(diff.fks.drop).map((name) => (
                    <li key={name} className="text-red-600">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {diff.options && (
          <div>
            <h4 className="font-semibold text-lg mb-2">Tablo Seçenekleri</h4>
            {diff.options.engineChanged && (
              <p className="text-orange-600">
                Engine: {diff.options.engineChanged.from} → {diff.options.engineChanged.to}
              </p>
            )}
            {diff.options.charsetChanged && (
              <p className="text-orange-600">
                Charset: {diff.options.charsetChanged.from} → {diff.options.charsetChanged.to}
              </p>
            )}
            {diff.options.collationChanged && (
              <p className="text-orange-600">
                Collation: {diff.options.collationChanged.from} → {diff.options.collationChanged.to}
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Karşılaştırma Sonuçları</h2>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
              : 'text-gray-600'
          }`}
        >
          Özet
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 ${
            activeTab === 'tables'
              ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
              : 'text-gray-600'
          }`}
        >
          Tablolar
        </button>
        <button
          onClick={() => setActiveTab('script')}
          className={`px-4 py-2 ${
            activeTab === 'script'
              ? 'border-b-2 border-blue-600 text-blue-600 font-semibold'
              : 'text-gray-600'
          }`}
        >
          SQL Betiği
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <div className="text-2xl font-bold text-green-700">{result.summary.newTables}</div>
              <div className="text-sm text-gray-600">Yeni Tablolar</div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <div className="text-2xl font-bold text-red-700">{result.summary.missingTables}</div>
              <div className="text-sm text-gray-600">Eksik Tablolar</div>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-200 rounded">
              <div className="text-2xl font-bold text-orange-700">{result.summary.changedTables}</div>
              <div className="text-sm text-gray-600">Değişen Tablolar</div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="text-2xl font-bold text-blue-700">{result.summary.newViews}</div>
              <div className="text-sm text-gray-600">Yeni View'lar</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="grid grid-cols-3 gap-4">
          {/* Table List */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-2">Tablolar</h3>
            <div className="space-y-1">
              {result.diff.onlyInPrimary.tables.map((table) => (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedTable === table ? 'bg-blue-100' : 'hover:bg-gray-100'
                  } text-green-700 border-l-4 border-green-500`}
                >
                  {table} (yeni)
                </button>
              ))}
              {Object.keys(result.diff.changed).map((table) => (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedTable === table ? 'bg-blue-100' : 'hover:bg-gray-100'
                  } text-orange-700 border-l-4 border-orange-500`}
                >
                  {table} (değişti)
                </button>
              ))}
              {result.diff.onlyInSecondary.tables.map((table) => (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedTable === table ? 'bg-blue-100' : 'hover:bg-gray-100'
                  } text-red-700 border-l-4 border-red-500`}
                >
                  {table} (silinecek)
                </button>
              ))}
            </div>
          </div>

          {/* Table Details */}
          <div className="col-span-2 bg-white p-4 rounded-lg shadow">
            {selectedTable ? (
              <>
                <h3 className="font-semibold text-xl mb-4">{selectedTable}</h3>
                {result.diff.changed[selectedTable] ? (
                  renderTableDiff(selectedTable, result.diff.changed[selectedTable])
                ) : result.diff.onlyInPrimary.tables.includes(selectedTable) ? (
                  <p className="text-green-600">Bu tablo yeni oluşturulacak.</p>
                ) : (
                  <p className="text-red-600">Bu tablo silinecek.</p>
                )}
              </>
            ) : (
              <p className="text-gray-500">Detayları görmek için sol taraftan bir tablo seçin.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'script' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex gap-2 mb-4">
            <button
              onClick={copyScript}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              SQL'i Kopyala
            </button>
            <button
              onClick={downloadScript}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              İndir (.sql)
            </button>
          </div>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            <code>{result.script}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
