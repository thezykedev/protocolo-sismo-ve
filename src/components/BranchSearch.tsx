import { useMemo, useState } from 'preact/hooks';
import { formatVenezuelaPhone, toTelHref } from '../lib/phone';

export interface Branch {
  id: string;
  name: string;
  city: string;
  state: string;
  coords: { lat: number; lng: number };
  phones: { label: string; value: string; dial: string }[];
  address: string;
  email: string;
}

interface Props {
  branches: Branch[];
}

const STATE_ORDER = [
  'Amazonas',
  'Anzoátegui',
  'Apure',
  'Aragua',
  'Barinas',
  'Bolívar',
  'Carabobo',
  'Cojedes',
  'Delta Amacuro',
  'Distrito Capital',
  'Falcón',
  'Guárico',
  'La Guaira',
  'Lara',
  'Mérida',
  'Miranda',
  'Monagas',
  'Nueva Esparta',
  'Portuguesa',
  'Sucre',
  'Táchira',
  'Trujillo',
  'Yaracuy',
  'Zulia'
];

const STATE_RANK = new Map(STATE_ORDER.map((state, index) => [state, index]));

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export default function BranchSearch({ branches }: Props) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);

  const availableStates = useMemo(() => {
    const present = new Set(branches.map((b) => b.state).filter(Boolean));
    return STATE_ORDER.filter((state) => present.has(state));
  }, [branches]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return branches.filter((branch) => {
      if (stateFilter && branch.state !== stateFilter) return false;
      if (onlyWithPhone && branch.phones.length === 0) return false;
      if (!q) return true;
      return [
        branch.name,
        branch.city,
        branch.state,
        branch.address,
        branch.email,
        ...branch.phones.flatMap((p) => [p.label, p.value])
      ].some((field) => normalize(field).includes(q));
    });
  }, [branches, query, stateFilter, onlyWithPhone]);

  const groupedByState = useMemo(() => {
    const map = new Map<string, Branch[]>();
    for (const branch of filtered) {
      const key = branch.state || 'Sin estado';
      const list = map.get(key) ?? [];
      list.push(branch);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => {
      const rankA = STATE_RANK.get(a) ?? Number.MAX_SAFE_INTEGER;
      const rankB = STATE_RANK.get(b) ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b, 'es');
    });
  }, [filtered]);

  return (
    <div class="search-shell">
      <label class="small-mono" for="branch-search">
        Buscar filial
      </label>
      <input
        id="branch-search"
        class="search-input"
        type="search"
        value={query}
        onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
        placeholder="Ciudad, dirección, correo o teléfono parcial"
      />

      <div class="branch-filters">
        <label class="branch-filter">
          <span class="small-mono">Estado</span>
          <select
            class="branch-filter__select"
            value={stateFilter}
            onChange={(event) => setStateFilter((event.currentTarget as HTMLSelectElement).value)}
          >
            <option value="">Todos ({branches.length})</option>
            {availableStates.map((state) => {
              const count = branches.filter((b) => b.state === state).length;
              return (
                <option value={state} key={state}>
                  {state} ({count})
                </option>
              );
            })}
          </select>
        </label>

        <div class="branch-chips" role="group" aria-label="Filtros rápidos">
          <button
            type="button"
            class={`chip${onlyWithPhone ? ' chip--active' : ''}`}
            onClick={() => setOnlyWithPhone((v) => !v)}
            aria-pressed={onlyWithPhone}
          >
            Solo con teléfono
          </button>
          {(stateFilter || query || onlyWithPhone) && (
            <button
              type="button"
              class="chip chip--ghost"
              onClick={() => {
                setQuery('');
                setStateFilter('');
                setOnlyWithPhone(false);
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <p class="search-results-meta">
        {filtered.length} filial{filtered.length === 1 ? '' : 'es'} · {groupedByState.length}{' '}
        estado{groupedByState.length === 1 ? '' : 's'}
      </p>

      <div class="contact-groups">
        {groupedByState.map(([state, list]) => (
          <section class="contact-group" key={state}>
            <h2>{state}</h2>
            <div class="contacts-grid">
              {list.map((branch) => (
                <article class="contact-card" key={branch.id}>
                  <div class="contact-card__top">
                    <div class="stack">
                      <h3>Filial {branch.city}</h3>
                      <p class="contact-meta">
                        {branch.state} · {branch.coords.lat.toFixed(3)},{' '}
                        {branch.coords.lng.toFixed(3)}
                      </p>
                    </div>
                  </div>

                  {branch.phones.length > 0 ? (
                    <div class="phone-list">
                      {branch.phones.map((phone) => {
                        const displayValue = formatVenezuelaPhone(phone.value);
                        const href = toTelHref(phone.dial);

                        return (
                          <div class="phone-row" key={`${branch.id}-${phone.dial}`}>
                            <span>
                              <strong>{phone.label}</strong>
                              <span>{displayValue}</span>
                            </span>
                            {href ? (
                              <a class="contact-action" href={href}>
                                Llamar
                              </a>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p class="source-note">
                      Esta filial aún no tiene un teléfono publicado en esta guía. Verifica
                      localmente o consulta a Protección Civil.
                    </p>
                  )}

                  {branch.address && <p class="source-note">{branch.address}</p>}
                  {branch.email && (
                    <p class="source-note">
                      <a href={`mailto:${branch.email}`}>{branch.email}</a>
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {filtered.length === 0 && (
        <div class="empty-state">
          No hay filiales que coincidan. Prueba con otro estado, ciudad o limpia la búsqueda.
        </div>
      )}
    </div>
  );
}
