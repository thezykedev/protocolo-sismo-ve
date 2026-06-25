import { useEffect, useState } from 'preact/hooks';

interface KitItem {
  id: string;
  title: string;
  note: string;
  custom?: boolean;
}

interface Props {
  items: KitItem[];
  storageKey: string;
}

export default function KitChecklist({ items, storageKey }: Props) {
  const [done, setDone] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<KitItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');

  const customStorageKey = `${storageKey}-custom`;

  useEffect(() => {
    const saved = globalThis.localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      setDone(JSON.parse(saved) as string[]);
    } catch {
      globalThis.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    globalThis.localStorage.setItem(storageKey, JSON.stringify(done));
  }, [done, storageKey]);

  useEffect(() => {
    const saved = globalThis.localStorage.getItem(customStorageKey);
    if (!saved) return;

    try {
      setCustomItems(JSON.parse(saved) as KitItem[]);
    } catch {
      globalThis.localStorage.removeItem(customStorageKey);
    }
  }, [customStorageKey]);

  useEffect(() => {
    globalThis.localStorage.setItem(customStorageKey, JSON.stringify(customItems));
  }, [customItems, customStorageKey]);

  const allItems = [...items, ...customItems];
  const checkedCount = done.length;
  const total = allItems.length;
  const percent = total === 0 ? 0 : Math.round((checkedCount / total) * 100);

  const toggleItem = (id: string) => {
    setDone((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const addCustomItem = (event: Event) => {
    event.preventDefault();

    const title = newTitle.trim();
    const note = newNote.trim();
    if (!title) return;

    setCustomItems((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        title,
        note: note || 'Recordatorio personal.',
        custom: true
      }
    ]);
    setNewTitle('');
    setNewNote('');
  };

  const removeCustomItem = (id: string) => {
    setCustomItems((current) => current.filter((item) => item.id !== id));
    setDone((current) => current.filter((itemId) => itemId !== id));
  };

  return (
    <div>
      <section class="kit-panel">
        <div class="kit-header">
          <div>
            <p class="eyebrow">72 HORAS</p>
            <h2 class="kit-headline">Tu mochila de emergencia</h2>
            <p class="kit-copy">Marca lo que ya tienes listo. El progreso queda guardado en este dispositivo.</p>
          </div>
          <div class="kit-progress">
            <span class="stat-label">Progreso</span>
            <span class="stat-value">
              {checkedCount}/{total}
            </span>
          </div>
        </div>

        <div class="progress-rail" aria-hidden="true">
          <div class="progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </section>

      <form class="custom-kit-form" onSubmit={addCustomItem}>
        <div>
          <p class="eyebrow">PERSONALIZA</p>
          <h3>Agrega tus cosas</h3>
          <p>
            Usa esto para medicinas, inhalador, comida de mascotas, documentos extra o cualquier
            necesidad de tu hogar.
          </p>
        </div>
        <label>
          <span>Qué agregar</span>
          <input
            type="text"
            value={newTitle}
            onInput={(event) => setNewTitle((event.currentTarget as HTMLInputElement).value)}
            placeholder="Ej. inhalador, comida del perro"
          />
        </label>
        <label>
          <span>Nota opcional</span>
          <input
            type="text"
            value={newNote}
            onInput={(event) => setNewNote((event.currentTarget as HTMLInputElement).value)}
            placeholder="Dosis, cantidad, ubicación..."
          />
        </label>
        <button class="button-brutal" type="submit">
          Agregar
        </button>
      </form>

      <div class="checklist-grid">
        {allItems.map((item) => {
          const isDone = done.includes(item.id);

          return (
            <article
              key={item.id}
              class={`check-item ${isDone ? 'check-item--done' : ''}`}
            >
              <button class="check-item__main" type="button" onClick={() => toggleItem(item.id)}>
                <span class="check-toggle" aria-hidden="true"></span>
                <span class="check-item__content">
                  <span class="checklist-title">{item.title}</span>
                  <span class="checklist-copy">{item.note}</span>
                </span>
              </button>
              {item.custom && (
                <button
                  class="check-item__remove"
                  type="button"
                  onClick={() => removeCustomItem(item.id)}
                >
                  Quitar
                </button>
              )}
            </article>
          );
        })}
      </div>

      <div class="inline-actions">
        <button class="button-brutal" type="button" onClick={() => setDone([])}>
          Reiniciar checklist
        </button>
      </div>
    </div>
  );
}
