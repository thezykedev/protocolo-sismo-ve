import { useMemo, useState } from 'preact/hooks';
import { formatVenezuelaPhone, toTelHref } from '../lib/phone';

type ContactKind =
  | 'emergency'
  | 'ambulance'
  | 'fire'
  | 'civil'
  | 'police'
  | 'security'
  | 'support'
  | 'rescue'
  | 'redcross'
  | 'hospital'
  | 'seismic';

interface Phone {
  label: string;
  value: string;
  dial?: string;
  href?: string;
  actionLabel?: string;
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
  event?: string;
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
  support: 'Apoyo y comunidad',
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
  'support',
  'rescue',
  'redcross',
  'hospital',
  'seismic'
];

const regularKindOrder = kindOrder.filter((kind) => kind !== 'emergency');
const SPECIAL_EVENT_ID = 'terremoto-2026-06-24';
const SPECIAL_EVENT_LABEL = 'Terremoto 24 de junio 2026';

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

const STATE_BY_KEY: Record<string, string> = {
  amazonas: 'Amazonas',
  anzoategui: 'Anzoátegui',
  apure: 'Apure',
  aragua: 'Aragua',
  barinas: 'Barinas',
  bolivar: 'Bolívar',
  carabobo: 'Carabobo',
  cojedes: 'Cojedes',
  'delta amacuro': 'Delta Amacuro',
  'distrito capital': 'Distrito Capital',
  falcon: 'Falcón',
  guarico: 'Guárico',
  'la guaira': 'La Guaira',
  lara: 'Lara',
  merida: 'Mérida',
  miranda: 'Miranda',
  monagas: 'Monagas',
  'nueva esparta': 'Nueva Esparta',
  portuguesa: 'Portuguesa',
  sucre: 'Sucre',
  tachira: 'Táchira',
  trujillo: 'Trujillo',
  yaracuy: 'Yaracuy',
  zulia: 'Zulia',
  nacional: 'Nacional'
};

const EXACT_AREA_STATES: Record<string, string> = {
  'area metropolitana de caracas': 'Distrito Capital',
  antimano: 'Distrito Capital',
  'bella vista': 'Distrito Capital',
  caricuao: 'Distrito Capital',
  catia: 'Distrito Capital',
  chaguaramos: 'Distrito Capital',
  coche: 'Distrito Capital',
  'el algodon': 'Distrito Capital',
  'el avila': 'Distrito Capital',
  'el llanito': 'Distrito Capital',
  'el paraiso': 'Distrito Capital',
  'el valle': 'Distrito Capital',
  'la candelaria': 'Distrito Capital',
  'las mercedes': 'Distrito Capital',
  'los magallanes': 'Distrito Capital',
  'los palos grandes': 'Distrito Capital',
  'prados del este': 'Distrito Capital',
  'sabana grande': 'Distrito Capital',
  'san bernardino': 'Distrito Capital',
  'san martin': 'Distrito Capital',
  'santa rosalia': 'Distrito Capital',
  baruta: 'Miranda',
  chacao: 'Miranda',
  'el hatillo': 'Miranda',
  charallave: 'Miranda',
  sucre: 'Miranda',
  'catia la mar': 'La Guaira',
  'la guaira': 'La Guaira',
  valencia: 'Carabobo',
  'puerto cabello': 'Carabobo',
  anaco: 'Anzoátegui',
  guasdualito: 'Apure',
  maracay: 'Aragua',
  barinas: 'Barinas',
  'ciudad bolivar': 'Bolívar',
  coro: 'Falcón',
  calabozo: 'Guárico',
  barquisimeto: 'Lara',
  merida: 'Mérida',
  'punta de mata': 'Monagas',
  porlamar: 'Nueva Esparta',
  acarigua: 'Portuguesa',
  cumana: 'Sucre',
  'san antonio del tachira': 'Táchira',
  trujillo: 'Trujillo',
  aroa: 'Yaracuy',
  maracaibo: 'Zulia',
  'puerto ayacucho': 'Amazonas',
  'san carlos': 'Cojedes',
  tucupita: 'Delta Amacuro'
};

const AREA_STATE_MATCHERS: Array<[string, string]> = [
  ['area metropolitana de caracas', 'Distrito Capital'],
  ['vialidad nacional', 'Nacional'],
  ['vias expresas', 'Nacional'],
  ['venezuela', 'Nacional'],
  ['caracas', 'Distrito Capital'],
  ['antimano', 'Distrito Capital'],
  ['bella vista', 'Distrito Capital'],
  ['caricuao', 'Distrito Capital'],
  ['catia', 'Distrito Capital'],
  ['chaguaramos', 'Distrito Capital'],
  ['coche', 'Distrito Capital'],
  ['el algodon', 'Distrito Capital'],
  ['el avila', 'Distrito Capital'],
  ['el llanito', 'Distrito Capital'],
  ['el paraiso', 'Distrito Capital'],
  ['el valle', 'Distrito Capital'],
  ['la candelaria', 'Distrito Capital'],
  ['las mercedes', 'Distrito Capital'],
  ['los magallanes', 'Distrito Capital'],
  ['los palos grandes', 'Distrito Capital'],
  ['prados del este', 'Distrito Capital'],
  ['sabana grande', 'Distrito Capital'],
  ['san bernardino', 'Distrito Capital'],
  ['san martin', 'Distrito Capital'],
  ['santa rosalia', 'Distrito Capital'],
  ['baruta', 'Miranda'],
  ['chacao', 'Miranda'],
  ['el hatillo', 'Miranda'],
  ['charallave', 'Miranda'],
  ['catia la mar', 'La Guaira'],
  ['la guaira', 'La Guaira'],
  ['valencia', 'Carabobo'],
  ['puerto cabello', 'Carabobo'],
  ['anaco', 'Anzoátegui'],
  ['guasdualito', 'Apure'],
  ['maracay', 'Aragua'],
  ['barinas', 'Barinas'],
  ['ciudad bolivar', 'Bolívar'],
  ['coro', 'Falcón'],
  ['calabozo', 'Guárico'],
  ['barquisimeto', 'Lara'],
  ['merida', 'Mérida'],
  ['punta de mata', 'Monagas'],
  ['porlamar', 'Nueva Esparta'],
  ['acarigua', 'Portuguesa'],
  ['cumana', 'Sucre'],
  ['san antonio del tachira', 'Táchira'],
  ['trujillo', 'Trujillo'],
  ['aroa', 'Yaracuy'],
  ['maracaibo', 'Zulia'],
  ['puerto ayacucho', 'Amazonas'],
  ['san carlos', 'Cojedes'],
  ['tucupita', 'Delta Amacuro']
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function inferState(area: string): string {
  const normalizedArea = normalize(area);
  if (!normalizedArea) return 'Nacional';
  if (EXACT_AREA_STATES[normalizedArea]) return EXACT_AREA_STATES[normalizedArea];
  if (STATE_BY_KEY[normalizedArea]) return STATE_BY_KEY[normalizedArea];
  if (normalizedArea.includes('venezuela') || normalizedArea === 'vialidad nacional') {
    return 'Nacional';
  }

  const rawParts = area.split(/[,/]/).map((part) => part.trim()).filter(Boolean);
  const tail = rawParts.at(-1);
  if (tail) {
    const canonicalTail = STATE_BY_KEY[normalize(tail)];
    if (canonicalTail) return canonicalTail;
  }

  for (const [needle, state] of AREA_STATE_MATCHERS) {
    if (normalizedArea.includes(needle)) return state;
  }

  return tail ?? area;
}

export default function ContactSearch({ contacts }: Props) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [activeKinds, setActiveKinds] = useState<Set<ContactKind>>(new Set());
  const [specialFilter, setSpecialFilter] = useState(false);

  const enriched = useMemo(
    () =>
      contacts.map((c) => ({
        ...c,
        state: c.state ?? inferState(c.area)
      })),
    [contacts]
  );

  const emergencyResults = useMemo(
    () => enriched.filter((contact) => contact.kind === 'emergency' && !contact.event),
    [enriched]
  );

  const specialResults = useMemo(
    () => enriched.filter((contact) => contact.event === SPECIAL_EVENT_ID),
    [enriched]
  );

  const regularContacts = useMemo(
    () => enriched.filter((contact) => !contact.event && contact.kind !== 'emergency'),
    [enriched]
  );

  const stateCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const contact of regularContacts) {
      const state = contact.state ?? 'Nacional';
      counts.set(state, (counts.get(state) ?? 0) + 1);
    }
    return counts;
  }, [regularContacts]);

  const availableStates = useMemo(
    () => STATE_ORDER.filter((state) => stateCounts.has(state)),
    [stateCounts]
  );

  const normalizedQuery = normalize(query);

  const visibleContacts = useMemo(() => {
    const source = specialFilter ? specialResults : regularContacts;

    return source.filter((contact) => {
      if (!specialFilter && stateFilter && contact.state !== stateFilter) return false;
      if (!specialFilter && activeKinds.size > 0 && !activeKinds.has(contact.kind)) return false;
      if (!normalizedQuery) return true;

      return [
        contact.name,
        contact.area,
        contact.category,
        contact.state ?? '',
        contact.note,
        ...contact.phones.flatMap((phone) => [phone.label, phone.value, phone.href ?? ''])
      ].some((field) => normalize(field).includes(normalizedQuery));
    });
  }, [regularContacts, specialResults, specialFilter, normalizedQuery, stateFilter, activeKinds]);

  const groupedResults = useMemo(
    () =>
      regularKindOrder
        .map((kind) => ({
          kind,
          contacts: visibleContacts.filter((contact) => contact.kind === kind)
        }))
        .filter((group) => group.contacts.length > 0),
    [visibleContacts]
  );

  const specialGroupedResults = useMemo(() => {
    if (!specialFilter) return [];

    const groups = new Map<string, Contact[]>();
    for (const contact of visibleContacts) {
      const bucket = groups.get(contact.category) ?? [];
      bucket.push(contact);
      groups.set(contact.category, bucket);
    }

    return Array.from(groups.entries()).map(([category, contacts]) => ({
      category,
      contacts
    }));
  }, [specialFilter, visibleContacts]);

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
    setSpecialFilter(false);
  }

  function toggleSpecialFilter() {
    setSpecialFilter((prev) => {
      const next = !prev;
      if (next) {
        setQuery('');
        setStateFilter('');
        setActiveKinds(new Set());
      }
      return next;
    });
  }

  const hasFilters = Boolean(query) || Boolean(stateFilter) || activeKinds.size > 0 || specialFilter;
  const visibleCount = emergencyResults.length + visibleContacts.length;
  const visibleGroupCount =
    (specialFilter ? specialGroupedResults.length : groupedResults.length) +
    (emergencyResults.length > 0 ? 1 : 0);

  function renderContactCard(contact: Contact, showCategory = true) {
    return (
      <article class="contact-card" key={contact.id}>
        <div class="contact-card__top">
          <div class="stack">
            {showCategory && (
              <span
                class={`pill ${contact.kind === 'emergency' ? 'pill--verified' : 'pill--review'}`}
              >
                {contact.category}
              </span>
            )}
            <h3>{contact.name}</h3>
            <p class="contact-meta">
              {contact.area}
              {contact.state &&
              contact.state !== 'Nacional' &&
              !normalize(contact.area).includes(normalize(contact.state))
                ? ` · ${contact.state}`
                : ''}
            </p>
          </div>
        </div>

        <div class="phone-list">
          {contact.phones.map((phone) => {
            const displayValue = phone.href ? phone.value : formatVenezuelaPhone(phone.value);
            const href = phone.href ?? (phone.dial ? toTelHref(phone.dial) : undefined);

            return (
              <div
                class={`phone-row ${phone.href ? 'phone-row--external' : ''}`}
                key={`${contact.id}-${phone.dial ?? phone.href ?? phone.label}`}
              >
                <span>
                  <strong>{phone.label}</strong>
                  <span>{displayValue}</span>
                </span>
                {href ? (
                  <a
                    class={`contact-action${phone.href ? ' contact-action--muted' : ''}`}
                    href={href}
                    target={phone.href ? '_blank' : undefined}
                    rel={phone.href ? 'noreferrer' : undefined}
                  >
                    {phone.actionLabel ?? (phone.href ? 'Abrir enlace' : 'Llamar')}
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>

        <p class="source-note">{contact.note}</p>
      </article>
    );
  }

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
        <div class="branch-chips branch-chips--stacked" role="group" aria-label="Filtro especial">
          <button
            type="button"
            class={`chip chip--special${specialFilter ? ' chip--active' : ''}`}
            onClick={toggleSpecialFilter}
            aria-pressed={specialFilter}
          >
            {SPECIAL_EVENT_LABEL}
          </button>
          {hasFilters && (
            <button type="button" class="chip chip--ghost" onClick={clearFilters}>
              Limpiar
            </button>
          )}
        </div>

        {specialFilter ? (
          <p class="search-results-meta">
            Mostrando solo apoyo del terremoto 24 de junio 2026. Los números generales siguen
            visibles arriba.
          </p>
        ) : (
          <>
            <label class="branch-filter">
              <span class="small-mono">Estado / región</span>
              <select
                class="branch-filter__select"
                value={stateFilter}
                onChange={(event) =>
                  setStateFilter((event.currentTarget as HTMLSelectElement).value)
                }
              >
                <option value="">Todos ({regularContacts.length})</option>
                {availableStates.map((state) => {
                  const count = stateCounts.get(state) ?? 0;
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
            </div>
          </>
        )}
      </div>

      <p class="search-results-meta">
        {visibleCount} contacto{visibleCount === 1 ? '' : 's'} · {visibleGroupCount} categoría
        {visibleGroupCount === 1 ? '' : 's'}
      </p>

      <div class="contact-groups">
        {emergencyResults.length > 0 && (
          <section class="contact-group contact-group--pinned">
            <h2>Emergencias generales</h2>
            <div class="contacts-grid">{emergencyResults.map((contact) => renderContactCard(contact, false))}</div>
          </section>
        )}

        {specialFilter
          ? specialGroupedResults.map((group) => (
              <section class="contact-group" key={group.category}>
                <h2>{group.category}</h2>
                <div class="contacts-grid">
                  {group.contacts.map((contact) => renderContactCard(contact))}
                </div>
              </section>
            ))
          : groupedResults.map((group) => (
              <section class="contact-group" key={group.kind}>
                <h2>{kindLabels[group.kind]}</h2>
                <div class="contacts-grid">
                  {group.contacts.map((contact) => renderContactCard(contact))}
                </div>
              </section>
            ))}
      </div>

      {specialFilter && visibleContacts.length === 0 ? (
        <div class="empty-state">
          No hay coincidencias en el filtro especial. Los números generales siguen visibles arriba.
        </div>
      ) : visibleContacts.length === 0 && emergencyResults.length === 0 ? (
        <div class="empty-state">
          No hay coincidencias. Prueba con municipio, servicio o número parcial.
        </div>
      ) : null}
    </div>
  );
}
