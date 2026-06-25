import { useMemo, useState } from 'preact/hooks';

type ContactKind =
  | 'emergency'
  | 'ambulance'
  | 'fire'
  | 'civil'
  | 'police'
  | 'security'
  | 'rescue'
  | 'redcross'
  | 'hospital'
  | 'seismic';

interface Phone {
  label: string;
  value: string;
  dial: string;
}

export interface Contact {
  id: string;
  name: string;
  area: string;
  category: string;
  kind: ContactKind;
  note: string;
  phones: Phone[];
  state?: string;
}

interface Props {
  contacts: Contact[];
}

const kindLabels: Record<ContactKind, string> = {
  emergency: 'Emergencias',
  ambulance: 'Ambulancias',
  fire: 'Bomberos',
  civil: 'Protección Civil',
  police: 'Policía',
  security: 'Seguridad y tránsito',
  rescue: 'Rescate y atención vial',
  redcross: 'Cruz Roja',
  hospital: 'Hospitales y clínicas',
  seismic: 'Información sísmica'
};

const kindOrder: ContactKind[] = [
  'emergency',
  'ambulance',
  'fire',
  'civil',
  'police',
  'security',
  'rescue',
  'redcross',
  'hospital',
  'seismic'
];

const STATE_ORDER = [
  'Distrito Capital',
  'Amazonas',
  'Anzoátegui',
  'Apure',
  'Aragua',
  'Barinas',
  'Bolívar',
  'Carabobo',
  'Cojedes',
  'Delta Amacuro',
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
  'Zulia',
  'Nacional'
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function inferState(area: string): string {
  if (!area) return 'Nacional';
  if (area.includes(',')) {
    return area.split(',').pop()!.trim();
  }
  if (area.toLowerCase() === 'caracas') return 'Distrito Capital';
  if (area.toLowerCase() === 'venezuela' || area.toLowerCase() === 'vialidad nacional') {
    return 'Nacional';
  }
  return area;
}

export default function ContactSearch({ contacts }: Props) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [activeKinds, setActiveKinds] = useState<Set<ContactKind>>(new Set());

  const enriched = useMemo(
    () =>
      contacts.map((c) => ({
        ...c,
        state: c.state ?? inferState(c.area)
      })),
    [contacts]
  );

  const availableStates = useMemo(() => {
    const present = new Set(enriched.map((c) => c.state ?? '').filter(Boolean));
    return STATE_ORDER.filter((state) => present.has(state));
  }, [enriched]);

  const normalizedQuery = normalize(query);

  const results = useMemo(() => {
    return enriched.filter((contact) => {
      if (stateFilter && contact.state !== stateFilter) return false;
      if (activeKinds.size > 0 && !activeKinds.has(contact.kind)) return false;
      if (!normalizedQuery) return true;
      return [
        contact.name,
        contact.area,
        contact.category,
        contact.state ?? '',
        contact.note,
        ...contact.phones.flatMap((phone) => [phone.label, phone.value])
      ].some((field) => normalize(field).includes(normalizedQuery));
    });
  }, [enriched, normalizedQuery, stateFilter, activeKinds]);

  const groupedResults = useMemo(
    () =>
      kindOrder
        .map((kind) => ({
          kind,
          contacts: results.filter((contact) => contact.kind === kind)
        }))
        .filter((group) => group.contacts.length > 0),
    [results]
  );

  function toggleKind(kind: ContactKind) {
    setActiveKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function clearFilters() {
    setQuery('');
    setStateFilter('');
    setActiveKinds(new Set());
  }

  const hasFilters = Boolean(query) || Boolean(stateFilter) || activeKinds.size > 0;

  return (
    <div class="search-shell">
      <label class="small-mono" for="contact-search">
        Buscar contacto
      </label>
      <input
        id="contact-search"
        class="search-input"
        type="search"
        value={query}
        onInput={(event) => setQuery((event.currentTarget as HTMLInputElement).value)}
        placeholder="Ej. 911, Baruta, bomberos, Valencia"
      />

      <div class="branch-filters">
        <label class="branch-filter">
          <span class="small-mono">Estado / región</span>
          <select
            class="branch-filter__select"
            value={stateFilter}
            onChange={(event) =>
              setStateFilter((event.currentTarget as HTMLSelectElement).value)
            }
          >
            <option value="">Todos ({enriched.length})</option>
            {availableStates.map((state) => {
              const count = enriched.filter((c) => c.state === state).length;
              return (
                <option value={state} key={state}>
                  {state} ({count})
                </option>
              );
            })}
          </select>
        </label>

        <div class="branch-chips" role="group" aria-label="Filtrar por tipo de servicio">
          {kindOrder.map((kind) => (
            <button
              type="button"
              class={`chip${activeKinds.has(kind) ? ' chip--active' : ''}`}
              onClick={() => toggleKind(kind)}
              aria-pressed={activeKinds.has(kind)}
              key={kind}
            >
              {kindLabels[kind]}
            </button>
          ))}
          {hasFilters && (
            <button type="button" class="chip chip--ghost" onClick={clearFilters}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      <p class="search-results-meta">
        {results.length} contacto{results.length === 1 ? '' : 's'} ·{' '}
        {groupedResults.length} categoría{groupedResults.length === 1 ? '' : 's'}
      </p>

      <div class="contact-groups">
        {groupedResults.map((group) => (
          <section class="contact-group" key={group.kind}>
            <h2>{kindLabels[group.kind]}</h2>
            <div class="contacts-grid">
              {group.contacts.map((contact) => (
                <article class="contact-card" key={contact.id}>
                  <div class="contact-card__top">
                    <div class="stack">
                      <span
                        class={`pill ${
                          contact.kind === 'emergency' ? 'pill--verified' : 'pill--review'
                        }`}
                      >
                        {contact.category}
                      </span>
                      <h3>{contact.name}</h3>
                      <p class="contact-meta">
                        {contact.area}
                        {contact.state && contact.state !== 'Nacional' && contact.state !== contact.area
                          ? ` · ${contact.state}`
                          : ''}
                      </p>
                    </div>
                  </div>

                  <div class="phone-list">
                    {contact.phones.map((phone) => (
                      <div class="phone-row" key={`${contact.id}-${phone.dial}`}>
                        <span>
                          <strong>{phone.label}</strong>
                          <span>{phone.value}</span>
                        </span>
                        <a class="contact-action" href={`tel:${phone.dial}`}>
                          Llamar
                        </a>
                      </div>
                    ))}
                  </div>

                  <p class="source-note">{contact.note}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {results.length === 0 && (
        <div class="empty-state">
          No hay coincidencias. Prueba con municipio, servicio o número parcial.
        </div>
      )}
    </div>
  );
}