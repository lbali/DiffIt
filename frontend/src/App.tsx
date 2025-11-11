import { useState } from 'react';
import { ConnectionForm } from './components/ConnectionForm';
import { DiffResults } from './components/DiffResults';
import { ConnectionConfig, SchemaMetadata, CompareResponse } from './types';
import { apiService } from './services/api.service';

function App() {
  const [primaryConfig, setPrimaryConfig] = useState<ConnectionConfig | null>(null);
  const [secondaryConfig, setSecondaryConfig] = useState<ConnectionConfig | null>(null);
  const [primaryConnected, setPrimaryConnected] = useState(false);
  const [secondaryConnected, setSecondaryConnected] = useState(false);
  const [primaryDb, setPrimaryDb] = useState('');
  const [secondaryDb, setSecondaryDb] = useState('');
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [includeDrops, setIncludeDrops] = useState(false);

  const handleCompare = async () => {
    if (!primaryConfig || !secondaryConfig || !primaryDb || !secondaryDb) {
      alert('Lütfen her iki bağlantıyı da test edin ve veritabanlarını seçin.');
      return;
    }

    setComparing(true);
    setCompareResult(null);

    try {
      // Inspect both schemas
      const [primarySchema, secondarySchema]: [SchemaMetadata, SchemaMetadata] = await Promise.all([
        apiService.inspectSchema(primaryConfig, primaryDb),
        apiService.inspectSchema(secondaryConfig, secondaryDb),
      ]);

      // Compare
      const result = await apiService.compare(primarySchema, secondarySchema, includeDrops);
      setCompareResult(result);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Karşılaştırma hatası');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">DB Schema Diff</h1>
          <p className="text-gray-600">MySQL/MariaDB Şema Karşılaştırma Aracı</p>
        </header>

        {/* Connections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ConnectionForm
            title="Asıl (Primary) Bağlantı"
            isPrimary={true}
            onConnectionTest={(config, success) => {
              if (success) {
                setPrimaryConfig(config);
                setPrimaryConnected(true);
              } else {
                setPrimaryConnected(false);
              }
            }}
            onDatabasesList={() => {}}
            onDatabaseSelect={(db) => setPrimaryDb(db)}
          />

          <ConnectionForm
            title="İkinci (Secondary) Bağlantı"
            isPrimary={false}
            onConnectionTest={(config, success) => {
              if (success) {
                setSecondaryConfig(config);
                setSecondaryConnected(true);
              } else {
                setSecondaryConnected(false);
              }
            }}
            onDatabasesList={() => {}}
            onDatabaseSelect={(db) => setSecondaryDb(db)}
          />
        </div>

        {/* Compare Section */}
        {primaryConnected && secondaryConnected && primaryDb && secondaryDb && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold mb-4">Karşılaştırma</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Primary: <span className="font-semibold">{primaryDb}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Secondary: <span className="font-semibold">{secondaryDb}</span>
                </p>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeDrops}
                  onChange={(e) => setIncludeDrops(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">DROP komutlarını dahil et</span>
              </label>
            </div>
            <button
              onClick={handleCompare}
              disabled={comparing}
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-md hover:bg-purple-700 disabled:bg-gray-400 font-semibold"
            >
              {comparing ? 'Karşılaştırılıyor...' : 'Şemaları Karşılaştır'}
            </button>
          </div>
        )}

        {/* Results */}
        {compareResult && <DiffResults result={compareResult} />}
      </div>
    </div>
  );
}

export default App;
