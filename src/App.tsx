import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildZip3Index,
  loadZip3Data,
  totalPopulation,
  totalDemandIndex,
  type Zip3Zone,
} from './data';
import { Zip3Lookup } from './components/Zip3Lookup';
import { MethodologyFaq } from './components/MethodologyFaq';
import { ReachAndExpand } from './components/ReachAndExpand';
import { UsStateDensityMap } from './components/UsStateDensityMap';
import { AppHero } from './components/AppHero';
import { ZIP3_HELP } from './labels';
import './App.css';

type Mode = 'reach' | 'lookup' | 'density' | 'methodology';

function App() {
  const [mode, setMode] = useState<Mode>('reach');
  const [zones, setZones] = useState<Zip3Zone[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedZip3s, setSavedZip3s] = useState<string[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const savedZip3sRef = useRef<string[]>([]);

  useEffect(() => {
    savedZip3sRef.current = savedZip3s;
  }, [savedZip3s]);

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
      if (savedZip3sRef.current.includes(zip3)) {
        setAddError('Location already saved.');
        return false;
      }
      const next = [...savedZip3sRef.current, zip3];
      savedZip3sRef.current = next;
      setSavedZip3s(next);
      setAddError(null);
      return true;
    },
    [zip3Index],
  );

  const removeSavedZip3 = useCallback((zip3: string) => {
    setSavedZip3s((prev) => {
      const next = prev.filter((z) => z !== zip3);
      savedZip3sRef.current = next;
      return next;
    });
    setAddError(null);
  }, []);

  return (
    <div className="app-shell">
      <header className="site-header">
        <AppHero
          totalPopulation={usTotalPop}
          zoneCount={zones?.length ?? 0}
          statsReady={!!zones}
        />

        <div className="site-header__chrome">
          <div className="site-header__inner">
            <nav className="mode-tabs" aria-label="Application mode">
              <button
                type="button"
                className={mode === 'reach' ? 'tab tab--active' : 'tab'}
                onClick={() => setMode('reach')}
              >
                Reach &amp; Expand
              </button>
              <button
                type="button"
                className={mode === 'density' ? 'tab tab--active' : 'tab'}
                onClick={() => setMode('density')}
              >
                Population Density
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
          </div>
        </div>
      </header>

      <div className="app">
        <main className="app-main">
          {loadError && (
            <p className="message message--error">
              Failed to load data: {loadError}
            </p>
          )}

          {!zones && !loadError && (
            <p className="message message--loading">Loading reference data…</p>
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

          {zones && mode === 'reach' && (
            <ReachAndExpand
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

          {zones && mode === 'density' && <UsStateDensityMap zones={zones} />}
        </main>
      </div>
    </div>
  );
}

export default App;
