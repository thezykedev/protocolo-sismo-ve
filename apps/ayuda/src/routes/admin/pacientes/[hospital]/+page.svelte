<script lang="ts">
  export let data: {
    generatedAt: string;
    slug: string;
    display_hospital: string;
    attribution: string;
    vrChecked: boolean;
    totals: {
      images: number;
      records: number;
      withCedulaFull: number;
      lowConfidence: number;
      vrMatched: number;
      vrNew: number;
      vrOnly: number;
      duplicates: number;
    };
    images: Array<{
      image: string;
      image_url: string;
      records: Array<{
        source_record_id: string;
        patient_name: string;
        age?: number;
        cedula_last3: string;
        cedula_full?: string;
        condition_public?: string;
        public_notes?: string;
        raw_line: string;
        source_line: number;
        confidence: number;
        flags: string[];
        pb: { id: string; status: string; verification_status?: string } | null;
        vr: {
          vr_id: string;
          nombre: string;
          edad: number | null;
          sexo: string | null;
          ubicacion: string | null;
          fecha: string | null;
          ficha_url: string | null;
          score: number;
          name_overlap: number;
          cedula_hint: boolean;
        } | null;
        vr_status?: 'matched' | 'only_ours';
        cne_links: Array<{ label: string; url: string; note: string }>;
      }>;
    }>;
  };

  let image = data.images[0]?.image ?? '';
  let query = '';
  let confidence = '';
  let external = '';
  let vrFilter = '';
  let copied = '';

  $: current = data.images.find((item) => item.image === image) ?? data.images[0];
  $: records = (current?.records ?? []).filter((record) => {
    const text = query.trim().toLowerCase();
    const matchesText =
      !text ||
      [record.patient_name, record.raw_line, record.source_record_id, record.cedula_full, record.cedula_last3]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(text);
    const matchesConfidence =
      !confidence ||
      (confidence === 'low' ? record.confidence < 70 : record.confidence < 82);
    const score = record.vr?.score ?? 0;
    const hasVr = !!record.vr;
    const matchesExternal =
      !external ||
      (external === 'strong' ? score >= 0.75 : external === 'possible' ? score >= 0.6 && score < 0.75 : !hasVr);
    const matchesVr =
      !vrFilter ||
      (vrFilter === 'matched'
        ? record.vr_status === 'matched'
        : vrFilter === 'only_ours'
          ? record.vr_status === 'only_ours'
          : vrFilter === 'ficha'
            ? !!record.vr?.ficha_url
            : true);
    return matchesText && matchesConfidence && matchesExternal && matchesVr;
  });

  async function copyCedula(value: string | undefined) {
    if (!value) return;
    await navigator.clipboard.writeText(`V-${value}`);
    copied = value;
    window.setTimeout(() => {
      if (copied === value) copied = '';
    }, 1200);
  }
</script>

<svelte:head><title>{data.display_hospital} | Revisión de importación</title></svelte:head>

<section class="head">
  <div>
    <p class="eyebrow">IMPORTACIÓN · PACIENTES</p>
    <h1 class="title">{data.display_hospital}</h1>
    <p class="lead">Comparación operativa entre imagen fuente, línea transcrita y ficha cargada en revisión.</p>
  </div>
  <a class="button-brutal button-brutal--ghost" href="/admin/pacientes?source={data.slug}">Ver cola general</a>
</section>

<section class="stats" aria-label="Resumen de importación">
  <div><strong>{data.totals.records}</strong><span>registros</span></div>
  <div><strong>{data.totals.images}</strong><span>imágenes</span></div>
  <div><strong>{data.totals.withCedulaFull}</strong><span>cédula privada</span></div>
  <div><strong>{data.totals.lowConfidence}</strong><span>baja confianza</span></div>
  <div><strong>{data.totals.vrMatched}</strong><span>VR coincide</span></div>
  <div><strong>{data.totals.vrNew}</strong><span>VR nuevos</span></div>
  <div><strong>{data.totals.vrOnly}</strong><span>VR faltan</span></div>
  <div><strong>{data.totals.duplicates}</strong><span>duplicados</span></div>
</section>

<section class="toolbar" aria-label="Filtros de revisión">
  <label>
    <span>Imagen</span>
    <select class="in" bind:value={image}>
      {#each data.images as item}
        <option value={item.image}>{item.image}</option>
      {/each}
    </select>
  </label>
  <label>
    <span>Buscar</span>
    <input class="in" bind:value={query} placeholder="Nombre, cédula, línea" />
  </label>
  <label>
    <span>Confianza</span>
    <select class="in" bind:value={confidence}>
      <option value="">Todas</option>
      <option value="low">Baja (&lt;70)</option>
      <option value="review">Revisar (&lt;82)</option>
    </select>
  </label>
  <label>
    <span>Cruce externo</span>
    <select class="in" bind:value={external}>
      <option value="">Todos</option>
      <option value="strong">Match fuerte</option>
      <option value="possible">Posible</option>
      <option value="none">Sin cruce</option>
    </select>
  </label>
  <label>
    <span>Venezuela Reporta</span>
    <select class="in" bind:value={vrFilter}>
      <option value="">Todos</option>
      <option value="matched">Coincide</option>
      <option value="only_ours">Nuevo</option>
      <option value="ficha">Con ficha</option>
    </select>
  </label>
</section>

{#if current}
  <section class="review">
    <aside class="source">
      <div class="source__bar">
        <strong>{current.image}</strong>
        <span>{records.length}/{current.records.length}</span>
      </div>
      <img src={current.image_url} alt="Imagen original de lista hospitalaria" />
    </aside>

    <div class="rows">
      {#each records as record}
        <article class="row">
          <div class="row__main">
            <div>
              <h2>{record.patient_name}</h2>
              <p class="meta">
                Línea {record.source_line}
                · C.I. pública {record.cedula_last3 ? '*** ' + record.cedula_last3 : 'N/A'}
                {#if record.age}· {record.age} años{/if}
                · <span class:low={record.confidence < 70} class:mid={record.confidence >= 70 && record.confidence < 82} class="score">{record.confidence}</span>
              </p>
            </div>
            <div class="status">
              <span>{record.pb?.status ?? 'no cargado'}</span>
              {#if record.vr_status === 'matched'}
                <span class="cne-pill ok">VR coincide</span>
              {:else if record.vr_status === 'only_ours'}
                <span class="cne-pill warn">VR nuevo</span>
              {/if}
            </div>
          </div>

          <p class="raw">{record.raw_line}</p>

          <div class="details">
            <div>
              <strong>Cédula privada</strong>
              {#if record.cedula_full}
                <button class="copy" type="button" on:click={() => copyCedula(record.cedula_full)}>
                  V-{record.cedula_full}
                </button>
                {#if copied === record.cedula_full}<span class="copied">copiada</span>{/if}
              {:else}
                <span>N/A</span>
              {/if}
            </div>
            <div>
              <strong>CNE oficial</strong>
              <span class="cne-status muted">Sin verificación automática</span>
              <div class="links">
                {#if record.cne_links.length}
                  {#each record.cne_links as link}
                    <a href={link.url} target="_blank" rel="noreferrer" title={link.note}>{link.label}</a>
                  {/each}
                {:else}
                  <span>Sin cédula completa</span>
                {/if}
              </div>
            </div>
            <div>
              <strong>Venezuela Reporta</strong>
              {#if record.vr}
                {#if record.vr.ficha_url}
                  <a href={record.vr.ficha_url} target="_blank" rel="noreferrer">
                    {record.vr.nombre} · {Math.round(record.vr.score * 100)}%
                  </a>
                {:else}
                  <span>{record.vr.nombre} · {Math.round(record.vr.score * 100)}%</span>
                {/if}
                <span class="masked">{record.vr.ubicacion ?? 's/ubicación'} · {record.vr.fecha ?? 's/fecha'}</span>
              {:else}
                <span>Sin match</span>
              {/if}
            </div>
            <div>
              <strong>Flags</strong>
              <span>{record.flags.length ? record.flags.join(', ') : 'sin flags'}</span>
            </div>
          </div>
        </article>
      {/each}
    </div>
  </section>
{/if}

<footer class="attribution">Fuente externa: {data.attribution}</footer>

<style>
  .head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
    margin-bottom: 1rem;
  }
  .eyebrow {
    margin: 0 0 0.3rem;
    color: var(--accent-yellow, #f5c518);
    font-family: var(--mono);
    font-size: 0.75rem;
  }
  .title {
    margin: 0;
    font-family: var(--mono);
    font-size: 1.45rem;
    text-transform: uppercase;
  }
  .lead { margin: 0.35rem 0 0; color: var(--text-dim); }
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  .stats div {
    border: 1px solid var(--line);
    background: #101010;
    padding: 0.75rem;
  }
  .stats strong {
    display: block;
    color: var(--accent-yellow, #f5c518);
    font-family: var(--mono);
    font-size: 1.2rem;
  }
  .stats span { color: var(--text-muted); font-size: 0.8rem; }
  .toolbar {
    display: grid;
    grid-template-columns: minmax(220px, 1.4fr) minmax(160px, 1fr) minmax(130px, 0.7fr) minmax(150px, 0.8fr) minmax(120px, 0.6fr);
    gap: 0.7rem;
    margin-bottom: 1rem;
    padding: 0.8rem;
    border: 1px solid var(--line);
    background: #0e0e0e;
  }
  label { display: flex; flex-direction: column; gap: 0.3rem; color: var(--text-muted); font-size: 0.78rem; }
  .in {
    min-height: 44px;
    border: 1px solid var(--line);
    background: #050505;
    color: white;
    border-radius: 3px;
    padding: 0 0.65rem;
  }
  .review {
    display: grid;
    grid-template-columns: minmax(320px, 42%) 1fr;
    gap: 1rem;
    align-items: start;
  }
  .source {
    position: sticky;
    top: 0.75rem;
    border: 1px solid var(--line);
    background: #080808;
  }
  .source__bar {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.65rem;
    border-bottom: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 0.78rem;
  }
  .source img {
    width: 100%;
    max-height: 78vh;
    object-fit: contain;
    background: #000;
  }
  .rows { display: flex; flex-direction: column; gap: 0.7rem; }
  .row {
    border: 1px solid var(--line);
    background: #101010;
    padding: 0.85rem;
  }
  .row__main {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: start;
  }
  .row h2 {
    margin: 0;
    font-family: var(--mono);
    font-size: 1rem;
    text-transform: uppercase;
  }
  .meta { margin: 0.25rem 0 0; color: var(--text-dim); font-size: 0.82rem; }
  .score {
    display: inline-flex;
    min-width: 2.1rem;
    justify-content: center;
    border: 1px solid var(--line);
    color: #111;
    background: var(--accent-yellow, #f5c518);
    font-family: var(--mono);
  }
  .score.low { background: #8b1d1d; color: white; }
  .score.mid { background: var(--accent-orange); color: #111; }
  .status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    color: var(--text-muted);
    font-family: var(--mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }
  .raw {
    margin: 0.65rem 0;
    padding: 0.65rem;
    border-left: 3px solid var(--accent-orange);
    background: #080808;
    color: var(--text-muted);
  }
  .details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.65rem;
    font-size: 0.84rem;
  }
  .details > div {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }
  .details strong {
    color: var(--accent-yellow, #f5c518);
    font-family: var(--mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }
  .links { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .cne-status {
    color: var(--text-muted);
    font-family: var(--mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }
  .cne-status.pending { color: var(--accent-orange); }
  .cne-status.ok { color: var(--accent-yellow, #f5c518); }
  .cne-status.warn { color: var(--accent-orange); }
  .cne-status.muted { color: var(--text-muted); }
  .masked {
    font-family: var(--mono);
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    color: var(--text-dim);
  }
  .cne-pill {
    border: 1px solid var(--line);
    padding: 0 0.4rem;
  }
  .cne-pill.ok { color: #111; background: var(--accent-yellow, #f5c518); }
  .cne-pill.warn { color: #111; background: var(--accent-orange); }
  .cne-pill.muted { color: var(--text-muted); }
  a, .copy {
    color: var(--accent-yellow, #f5c518);
    overflow-wrap: anywhere;
  }
  .copy {
    min-height: 36px;
    border: 1px solid var(--line);
    background: #050505;
    text-align: left;
    padding: 0 0.5rem;
    cursor: pointer;
  }
  .copied { color: var(--accent-orange); font-family: var(--mono); font-size: 0.72rem; }
  .attribution {
    margin-top: 1rem;
    padding: 0.65rem 0.8rem;
    border-top: 1px solid var(--line);
    color: var(--text-muted);
    font-family: var(--mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }
  @media (max-width: 980px) {
    .toolbar, .review { grid-template-columns: 1fr; }
    .source { position: relative; top: auto; }
    .head { flex-direction: column; }
  }
</style>
