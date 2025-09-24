import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  applyProfileToStorage,
  deleteProfileById,
  getStrategyDefinitionById,
  readProfiles,
  renameProfile,
  StoredProfile,
  subscribeToPlanUpdates,
} from '../lib/calculatorStorage';

const btcFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 6,
  maximumFractionDigits: 6,
});

const formatDate = (value: string) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function Escenarios() {
  const [profiles, setProfiles] = useState<StoredProfile[]>(() => readProfiles());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setProfiles(readProfiles());
    const unsubscribe = subscribeToPlanUpdates(() => {
      setProfiles(readProfiles());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleActivate = useCallback(
    (profile: StoredProfile) => {
      applyProfileToStorage(profile);
      navigate('/');
    },
    [navigate]
  );

  const handleDelete = useCallback((id: string) => {
    const next = deleteProfileById(id);
    setProfiles(next);
  }, []);

  const startRename = useCallback((profile: StoredProfile) => {
    setEditingId(profile.id);
    setDraftName(profile.name);
  }, []);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setDraftName('');
  }, []);

  const handleRenameSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingId) return;
      const trimmed = draftName.trim();
      if (!trimmed) {
        cancelRename();
        return;
      }
      const next = renameProfile(editingId, trimmed);
      setProfiles(next);
      setEditingId(null);
      setDraftName('');
    },
    [cancelRename, draftName, editingId]
  );

  const totalWallet = useMemo(
    () => profiles.reduce((sum, profile) => sum + profile.walletValue, 0),
    [profiles]
  );

  const activeCount = profiles.length;

  return (
    <div className="content-grid">
      <section className="card" aria-labelledby="escenarios-heading">
        <div className="calculator__header">
          <div>
            <h2 id="escenarios-heading">Escenarios guardados</h2>
            <p className="calculator__subtitle">
              Gestiona tus configuraciones de retiro, actívalas en la calculadora o renómbralas para
              mantenerlas ordenadas.
            </p>
          </div>
          <div className="calculator__goal-stats" aria-live="polite">
            <article>
              <span>Total de escenarios</span>
              <strong>{activeCount}</strong>
            </article>
            <article>
              <span>BTC agregados</span>
              <strong>{btcFormatter.format(totalWallet)} BTC</strong>
            </article>
          </div>
        </div>

        {profiles.length === 0 ? (
          <p className="help">
            Guarda un escenario desde la calculadora para verlo aquí. Podrás activarlo en cualquier momento.
          </p>
        ) : (
          <ul className="calculator__profiles-list" role="list">
            {profiles.map((profile) => {
              const strategy = getStrategyDefinitionById(profile.strategy);
              const isEditing = editingId === profile.id;

              return (
                <li key={profile.id} className="calculator__profile-item">
                  <div>
                    {isEditing ? (
                      <form className="calculator__profile-form" onSubmit={handleRenameSubmit}>
                        <label className="visualmente-oculto" htmlFor={`rename-${profile.id}`}>
                          Renombrar escenario
                        </label>
                        <input
                          id={`rename-${profile.id}`}
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          autoFocus
                        />
                        <div className="calculator__profile-actions">
                          <button type="submit" className="primary-button">
                            Guardar
                          </button>
                          <button type="button" className="ghost-button" onClick={cancelRename}>
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <h3>{profile.name}</h3>
                        <dl>
                          <div>
                            <dt>Wallet</dt>
                            <dd>{btcFormatter.format(profile.walletValue)} BTC</dd>
                          </div>
                          <div>
                            <dt>Intocable</dt>
                            <dd>{btcFormatter.format(profile.btcIntocableValue)} BTC</dd>
                          </div>
                          <div>
                            <dt>Frecuencia</dt>
                            <dd>{profile.frequency === 'weekly' ? 'Semanal' : 'Mensual'}</dd>
                          </div>
                          <div>
                            <dt>Finaliza</dt>
                            <dd>{formatDate(profile.selectedDate)}</dd>
                          </div>
                          <div>
                            <dt>Estrategia</dt>
                            <dd>{strategy?.label ?? profile.strategy}</dd>
                          </div>
                          <div>
                            <dt>Objetivo mensual</dt>
                            <dd>{profile.monthlyTarget > 0 ? `${profile.monthlyTarget.toFixed(2)} EUR` : 'Sin objetivo'}</dd>
                          </div>
                        </dl>
                      </>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="calculator__profile-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => handleActivate(profile)}
                      >
                        Activar en calculadora
                      </button>
                      <button type="button" className="secondary-button" onClick={() => startRename(profile)}>
                        Renombrar
                      </button>
                      <button type="button" className="ghost-button" onClick={() => handleDelete(profile.id)}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
