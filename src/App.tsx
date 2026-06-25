import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildZip3Index,
  loadZip3Data,
  totalPopulation,
  totalDemandIndex,
  type Zip3Zone,
} from './data';
import { Zip3Lookup } from './components/Zip3Lookup';
import { CoverageAnalysis } from './components/CoverageAnalysis';
import { MethodologyFaq } from './components/MethodologyFaq';
import { NetworkCoverage } from './components/NetworkCoverage';
import { UsStateDensityMap } from './components/UsStateDensityMap';
import { ZIP3_HELP } from './labels';
import './App.css';

type Mode = 'lookup' | 'coverage' | 'density' | 'network' | 'methodology';

function App() {
  const [mode, setMode] = useState<Mode>('coverage');
  const [zones, setZones] = useState<Zip3Zone[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedZip3s, setSavedZip3s] = useState<string[]>([]);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    loadZip3Data()
      .then(setZones)
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const zip3Index = useMemo(
    () => (zones ? buildZip3Index(zones) : new Map<string, Zip3Zone>()),
    [zones],
  );

  const usTotalPop = useMemo(
    () => (zones ? totalPopulation(zones) : 0),
    [zones],
  );

  const usTotalDemand = useMemo(
    () => (zones ? totalDemandIndex(zones) : 0),
    [zones],
  );

  const addSavedZip3 = useCallback(
    (zip3: string): boolean => {
      if (!zip3Index.has(zip3)) {
        setAddError(`ZIP-3 ${ZIP3_HELP} not in dataset.`);
        return false;
      }
      if (savedZip3s.includes(zip3)) {
        setAddError('Location already saved.');
        return false;
      }
      setAddError(null);
      setSavedZip3s((prev) => [...prev, zip3]);
      return true;
    },
    [zip3Index, savedZip3s],
  );

  const removeSavedZip3 = useCallback((zip3: string) => {
    setSavedZip3s((prev) => prev.filter((z) => z !== zip3));
    setAddError(null);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Where to build</h1>
        <p className="subtitle">
          Evaluate distribution node locations against US demand geography
        </p>
      </header>

      <nav className="mode-tabs" aria-label="Application mode">
        <button
          type="button"
          className={mode === 'coverage' ? 'tab tab--active' : 'tab'}
          onClick={() => setMode('coverage')}
        >
          Coverage Analysis
        </button>
        <button
          type="button"
          className={mode === 'density' ? 'tab tab--active' : 'tab'}
          onClick={() => setMode('density')}
        >
          State Density
        </button>
        <button
          type="button"
          className={mode === 'network' ? 'tab tab--active' : 'tab'}
          onClick={() => setMode('network')}
        >
          Current network reach
        </button>
        <button
          type="button"
          className={mode === 'lookup' ? 'tab tab--active' : 'tab'}
          onClick={() => setMode('lookup')}
        >
          ZIP-3 Lookup
        </button>
        <button
          type="button"
          className={mode === 'methodology' ? 'tab tab--active' : 'tab'}
          onClick={() => setMode('methodology')}
        >
          Methodology
        </button>
      </nav>

      <main className="app-main">
        {loadError && (
          <p className="message message--error">Failed to load data: {loadError}</p>
        )}

        {!zones && !loadError && (
          <p className="message message--loading">Loading reference data…</p>
        )}

        {zones && mode !== 'methodology' && (
          <p className="load-status">
            {zones.length} zones loaded (ZIP-3 {ZIP3_HELP})
          </p>
        )}

        {mode === 'methodology' && <MethodologyFaq />}

        {zones && mode === 'lookup' && (
          <Zip3Lookup
            savedZip3s={savedZip3s}
            zip3Index={zip3Index}
            onAdd={addSavedZip3}
            onRemove={removeSavedZip3}
            addError={addError}
            onClearError={() => setAddError(null)}
          />
        )}

        {zones && mode === 'coverage' && (
          <CoverageAnalysis
            zones={zones}
            zip3Index={zip3Index}
            totalUsPopulation={usTotalPop}
            savedZip3s={savedZip3s}
            onAdd={addSavedZip3}
            onRemove={removeSavedZip3}
            addError={addError}
            onClearError={() => setAddError(null)}
          />
        )}

        {zones && mode === 'density' && <UsStateDensityMap zones={zones} />}

        {zones && mode === 'network' && (
          <NetworkCoverage
            zones={zones}
            zip3Index={zip3Index}
            totalUsPopulation={usTotalPop}
            totalUsDemandIndex={usTotalDemand}
            savedZip3s={savedZip3s}
            onAdd={addSavedZip3}
            onRemove={removeSavedZip3}
            addError={addError}
            onClearError={() => setAddError(null)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
