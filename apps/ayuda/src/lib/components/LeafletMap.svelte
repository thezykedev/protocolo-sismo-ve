<script lang="ts">
  import 'leaflet/dist/leaflet.css';
  import { onMount } from 'svelte';

  export interface MapMarker {
    lat: number;
    lng: number;
    label: string;
    popup: string;
    magnitude?: number;
    color?: string;
  }

  export let markers: MapMarker[] = [];
  export let title = 'Mapa';
  export let description = '';
  export let headingId = 'mapa';
  export let emptyLabel = 'Sin marcadores disponibles.';

  let container: HTMLDivElement;
  let ready = false;

  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  onMount(async () => {
    let map: import('leaflet').Map | null = null;
    let disposed = false;
    const leaflet = await import('leaflet');

    if (disposed || !container) return;

    map = leaflet.map(container, {
      scrollWheelZoom: false,
      preferCanvas: true
    });

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      })
      .addTo(map);

    const points: Array<[number, number]> = [];
    const layer = leaflet.layerGroup().addTo(map);

    markers.forEach((marker) => {
      points.push([marker.lat, marker.lng]);
      const size = Math.max(6, Math.min(16, (marker.magnitude ?? 1) * 2.6));

      leaflet
        .circleMarker([marker.lat, marker.lng], {
          radius: size,
          color: marker.color ?? '#ff6600',
          weight: 2,
          fillColor: marker.color ?? '#ffff00',
          fillOpacity: 0.9
        })
        .bindPopup(
          `
            <div class="leaflet-popup-content">
              <strong>${escapeHtml(marker.label)}</strong><br />
              ${marker.popup}
            </div>
          `,
          { closeButton: false, maxWidth: 280 }
        )
        .addTo(layer);
    });

    if (points.length > 0) {
      map.fitBounds(leaflet.latLngBounds(points), { padding: [32, 32], maxZoom: 8 });
    } else {
      map.setView([8.5, -66.5], 5.8);
    }

    ready = true;

    return () => {
      disposed = true;
      map?.remove();
    };
  });
</script>

<section class="surface" aria-labelledby={headingId}>
  <div class="stack" style="margin-bottom: 1rem;">
    <div>
      <p class="eyebrow">MAPA</p>
      <h2 id={headingId}>{title}</h2>
    </div>
    {#if description}
      <p class="hero-copy">{description}</p>
    {/if}
  </div>

  <div class="surface" style="padding: 0;">
    <div bind:this={container} class="leaflet-map" aria-hidden="true"></div>
    {#if !ready}
      <div class="map-overlay">Cargando mapa colaborativo…</div>
    {/if}
    {#if markers.length === 0}
      <div class="map-empty">{emptyLabel}</div>
    {/if}
  </div>
</section>
