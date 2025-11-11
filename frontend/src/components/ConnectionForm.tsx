import { useState } from 'react';
import { ConnectionConfig } from '../types';
import { apiService } from '../services/api.service';

interface ConnectionFormProps {
  title: string;
  isPrimary: boolean;
  onConnectionTest: (config: ConnectionConfig, success: boolean) => void;
  onDatabasesList: (databases: string[]) => void;
  onDatabaseSelect: (database: string) => void;
}

export function ConnectionForm({
  title,
  isPrimary,
  onConnectionTest,
  onDatabasesList,
  onDatabaseSelect,
}: ConnectionFormProps) {
  const [config, setConfig] = useState<ConnectionConfig>({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState('');

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await apiService.testConnection(config);
      if (result.ok) {
        setTestResult({
          ok: true,
          message: `Bağlantı başarılı! ${result.flavor?.toUpperCase()} ${result.serverVersion}`,
        });
        onConnectionTest(config, true);
      } else {
        setTestResult({ ok: false, message: result.error || 'Bağlantı başarısız' });
        onConnectionTest(config, false);
      }
    } catch (error) {
      setTestResult({
        ok: false,
        message: error instanceof Error ? error.message : 'Bağlantı hatası',
      });
      onConnectionTest(config, false);
    } finally {
      setTesting(false);
    }
  };

  const handleListDatabases = async () => {
    setLoading(true);
    try {
      const dbs = await apiService.listDatabases(config);
      setDatabases(dbs);
      onDatabasesList(dbs);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Veritabanları listelenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDbSelect = (db: string) => {
    setSelectedDb(db);
    onDatabaseSelect(db);
  };

  const cardClass = isPrimary
    ? 'border-blue-500 bg-blue-50'
    : 'border-green-500 bg-green-50';

  return (
    <div className={`border-2 rounded-lg p-6 ${cardClass}`}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Host</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Port</label>
          <input
            type="number"
            className="w-full px-3 py-2 border rounded-md"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 3306 })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Kullanıcı</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            value={config.user}
            onChange={(e) => setConfig({ ...config, user: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Şifre</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-md"
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
          />
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {testing ? 'Test ediliyor...' : 'Bağlantıyı Test Et'}
        </button>

        {testResult && (
          <div
            className={`p-3 rounded-md ${
              testResult.ok
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}
          >
            {testResult.message}
          </div>
        )}

        {testResult?.ok && (
          <>
            <button
              onClick={handleListDatabases}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {loading ? 'Yükleniyor...' : 'Veritabanlarını Listele'}
            </button>

            {databases.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Veritabanı Seç</label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={selectedDb}
                  onChange={(e) => handleDbSelect(e.target.value)}
                >
                  <option value="">-- Seçiniz --</option>
                  {databases.map((db) => (
                    <option key={db} value={db}>
                      {db}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
