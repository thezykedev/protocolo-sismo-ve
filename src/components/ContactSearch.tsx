import { useState } from 'preact/hooks';

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

export default function ContactSearch({ contacts }: Props) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const results = contacts.filter((contact) => {
    if (!normalizedQuery) return true;

    return [
      contact.name,
      contact.area,
      contact.category,
      contact.note,
      ...contact.phones.flatMap((phone) => [phone.label, phone.value])
    ].some((field) => field.toLowerCase().includes(normalizedQuery));
  });

  const groupedResults = kindOrder
    .map((kind) => ({
      kind,
      contacts: results.filter((contact) => contact.kind === kind)
    }))
    .filter((group) => group.contacts.length > 0);

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

      <p class="search-results-meta">
        {results.length} contacto{results.length === 1 ? '' : 's'}
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
                      <p class="contact-meta">{contact.area}</p>
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