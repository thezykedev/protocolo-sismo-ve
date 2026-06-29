<script lang="ts" context="module">
  export interface MapMarker {
    id?: string;
    lat: number;
    lng: number;
    label: string;
    popup: string;
    magnitude?: number;
    color?: string;
  }
</script>

<script lang="ts">
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { createEventDispatcher, onMount } from 'svelte';
  import MapLoader from './MapLoader.svelte';

  export let markers: MapMarker[] = [];
  export let title = 'Mapa';
  export let description = '';
  export let headingId = 'mapa';
  export let emptyLabel = 'Sin marcadores disponibles.';
  export let selectedMarkerId: string | null = null;
  export let modes: Array<'positron' | '3d'> = ['positron', '3d'];
  export let loaderLabel = 'Cargando mapa';
  export let loaderSublabel = '';

  const dispatch = createEventDispatcher<{ select: { id: string } }>();

  const TARGET_ZOOM = 7.5;
  const SELECTED_FILTER_NONE = '__sismo-ve-none__';

  let container: HTMLDivElement;
  let ready = false;
  let mode: 'positron' | '3d' = 'positron';
  let mapInstance: import('maplibre-gl').Map | null = null;
  let maplibre: typeof import('maplibre-gl') | null = null;
  let popup: import('maplibre-gl').Popup | null = null;
  // Id resaltado actualmente en el mapa; se reaplica tras recargar el estilo.
  let selectedId: string | null = null;
  // Enfoque solicitado antes de que el mapa/estilo estuviera listo.
  let pendingFocusId: string | null = null;

  function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  const styles = {
    positron: 'https://tiles.openfreemap.org/styles/positron',
    '3d': 'https://tiles.openfreemap.org/styles/liberty'
  };

  const modeLabels = {
    positron: 'Positron',
    '3d': '3D View'
  };

  function escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function markerCollection(): any {
    return {
      type: 'FeatureCollection',
      features: markers.map((marker) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [marker.lng, marker.lat]
        },
        properties: {
          id: marker.id ?? `${marker.lat}-${marker.lng}-${marker.label}`,
          label: marker.label,
          popup: marker.popup,
          magnitude: marker.magnitude ?? 1,
          color: marker.color ?? '#ffff00'
        }
      }))
    };
  }

  function markerRadius(marker: MapMarker): number {
    // Coincide con la expresión de radio de la capa "core": 4 + magnitud * 1.8.
    return 4 + (marker.magnitude ?? 1) * 1.8;
  }

  function openPopup(marker: MapMarker) {
    if (!mapInstance || !maplibre) return;
    popup?.remove();
    popup = new maplibre.Popup({
      closeButton: true,
      closeOnMove: false,
      maxWidth: '280px',
      anchor: 'bottom',
      offset: markerRadius(marker) + 6
    })
      .setLngLat([marker.lng, marker.lat])
      .setHTML(`<div class="maplibre-popup-content"><strong>${escapeHtml(marker.label)}</strong><br />${marker.popup}</div>`)
      .addTo(mapInstance);
  }

  function applySelectionFilter() {
    const map = mapInstance;
    if (!map || !map.getLayer('sismo-ve-marker-selected')) return;
    map.setFilter('sismo-ve-marker-selected', ['==', ['get', 'id'], selectedId ?? SELECTED_FILTER_NONE]);
  }

  function setSelected(markerId: string | null) {
    selectedId = markerId;
    applySelectionFilter();
  }

  // Mueve la cámara para dejar el marcador centrado con hueco arriba para el popup.
  // El desplazamiento se aplica vía `offset` de easeTo (cámara de destino), no por
  // proyección al zoom actual, para que el encuadre sea correcto al cambiar el zoom.
  function focusMarker(markerId: string | null) {
    const map = mapInstance;
    if (!map || !markerId) return;
    const marker = markers.find((item) => item.id === markerId);
    if (!marker) {
      // El id ya no está en la lista (p. ej. filtrado fuera): limpiar selección.
      popup?.remove();
      setSelected(null);
      return;
    }

    if (!map.isStyleLoaded()) {
      pendingFocusId = markerId;
      return;
    }
    pendingFocusId = null;

    const reduced = prefersReducedMotion();
    setSelected(markerId);
    openPopup(marker);

    // Centrar el contenido del popup (no el marcador) en el mapa. El popup se ancla
    // arriba del marcador, así que la cámara desplaza el marcador hacia abajo
    // (radio + media altura del popup) para que el centro del popup caiga en el centro
    // del viewport. El alto del popup se mide del DOM real porque depende del contenido.
    const ease = () => {
      const popupAnchorOffset = markerRadius(marker) + 6;
      const content = popup?.getElement()?.querySelector('.maplibregl-popup-content') as HTMLElement | null;
      const popupHeight = content?.getBoundingClientRect().height ?? 150;
      const offsetY = clamp(popupAnchorOffset + popupHeight / 2, 72, container.clientHeight / 2 - 24);

      map.easeTo({
        center: [marker.lng, marker.lat],
        zoom: Math.max(map.getZoom(), TARGET_ZOOM),
        offset: [0, offsetY],
        pitch: mode === '3d' ? 62 : 0,
        duration: reduced ? 0 : 520
      });
    };

    if (reduced) {
      ease();
    } else {
      requestAnimationFrame(ease);
    }
  }

  export function focus(markerId: string) {
    focusMarker(markerId);
  }

  // Compatibilidad con llamadas previas.
  export function centerOnMarker(markerId: string) {
    focusMarker(markerId);
  }

  onMount(() => {
    let disposed = false;

    const addMarkerLayers = () => {
      const map = mapInstance;
      if (!map || !map.isStyleLoaded()) return;

      const existing = map.getSource('sismo-ve-markers') as import('maplibre-gl').GeoJSONSource | undefined;
      if (existing) {
        existing.setData(markerCollection());
      } else {
        map.addSource('sismo-ve-markers', {
          type: 'geojson',
          data: markerCollection()
        });
      }

      if (!map.getLayer('sismo-ve-marker-halo')) {
        map.addLayer({
          id: 'sismo-ve-marker-halo',
          type: 'circle',
          source: 'sismo-ve-markers',
          paint: {
            'circle-radius': ['+', 8, ['*', ['coalesce', ['get', 'magnitude'], 1], 2.8]],
            'circle-color': '#131313',
            'circle-opacity': 0.9,
            'circle-stroke-color': '#ffff00',
            'circle-stroke-width': 2
          }
        });
      }

      if (!map.getLayer('sismo-ve-marker-selected')) {
        map.addLayer({
          id: 'sismo-ve-marker-selected',
          type: 'circle',
          source: 'sismo-ve-markers',
          filter: ['==', ['get', 'id'], SELECTED_FILTER_NONE],
          paint: {
            'circle-radius': ['+', 16, ['*', ['coalesce', ['get', 'magnitude'], 1], 3.2]],
            'circle-color': 'rgba(255, 204, 0, 0.12)',
            'circle-stroke-color': '#ffcc00',
            'circle-stroke-width': 3,
            'circle-stroke-opacity': 0.95
          }
        });
      }

      if (!map.getLayer('sismo-ve-marker-core')) {
        map.addLayer({
          id: 'sismo-ve-marker-core',
          type: 'circle',
          source: 'sismo-ve-markers',
          paint: {
            'circle-radius': ['+', 4, ['*', ['coalesce', ['get', 'magnitude'], 1], 1.8]],
            'circle-color': ['coalesce', ['get', 'color'], '#ffff00'],
            'circle-opacity': 0.95,
            'circle-stroke-color': '#131313',
            'circle-stroke-width': 1
          }
        });
      }

      if (!map.getLayer('sismo-ve-marker-star')) {
        map.addLayer({
          id: 'sismo-ve-marker-star',
          type: 'symbol',
          source: 'sismo-ve-markers',
          filter: ['>=', ['get', 'magnitude'], 6.5],
          layout: {
            'text-field': '★',
            'text-size': 14,
            'text-allow-overlap': true,
            'text-ignore-placement': true
          },
          paint: {
            'text-color': '#131313'
          }
        });
      }

      // Restaurar el resaltado de selección tras (re)crear las capas (p. ej. cambio de modo).
      applySelectionFilter();
    };

    const applyPendingFocus = () => {
      if (pendingFocusId) focusMarker(pendingFocusId);
    };

    const fitToMarkers = (animated = false) => {
      const map = mapInstance;
      if (!map || !maplibre) return;

      if (markers.length === 0) {
        map.jumpTo({ center: [-66.5, 8.5], zoom: 5.1 });
        return;
      }

      const bounds = new maplibre.LngLatBounds();
      markers.forEach((marker) => bounds.extend([marker.lng, marker.lat]));
      map.fitBounds(bounds, { padding: 54, maxZoom: 8, duration: animated ? 450 : 0 });
    };

    void import('maplibre-gl').then((maplibregl) => {
      if (disposed || !container) return;
      maplibre = maplibregl;

      mapInstance = new maplibregl.Map({
        container,
        style: styles.positron,
        center: [-66.5, 8.5],
        zoom: 5.1,
        pitch: 0,
        bearing: 0,
        attributionControl: false
      });

      const map = mapInstance;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      map.on('load', () => {
        addMarkerLayers();
        fitToMarkers();
        ready = true;
        applyPendingFocus();
      });

      map.on('style.load', () => {
        addMarkerLayers();
        fitToMarkers(mode === '3d');
        applyPendingFocus();
      });

      map.on('click', 'sismo-ve-marker-core', (event) => {
        if (!event.features?.[0]) return;
        const feature = event.features[0];
        const props = feature.properties as { id?: string };
        if (props.id) {
          focusMarker(props.id);
          dispatch('select', { id: props.id });
        }
      });

      map.on('mouseenter', 'sismo-ve-marker-core', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'sismo-ve-marker-core', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => {
      disposed = true;
      popup?.remove();
      mapInstance?.remove();
      mapInstance = null;
    };
  });

  function setMode(nextMode: 'positron' | '3d') {
    if (!mapInstance || mode === nextMode) return;
    mode = nextMode;
    ready = false;
    mapInstance.setStyle(styles[nextMode]);

    mapInstance.easeTo({
      pitch: nextMode === '3d' ? 62 : 0,
      bearing: nextMode === '3d' ? -24 : 0,
      duration: 450
    });

    window.setTimeout(() => {
      ready = true;
    }, 500);
  }

  // El prop solo gobierna el resaltado del marcador; la cámara se mueve por focus()
  // imperativo o por clic en el marcador, evitando animaciones dobles.
  $: if (mapInstance) {
    setSelected(selectedMarkerId);
  }
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

  {#if modes.length > 1}
    <div class="map-mode-bar" aria-label="Modo de mapa">
      {#each modes as availableMode}
        <button
          class:map-mode-bar__button--active={mode === availableMode}
          class="map-mode-bar__button"
          type="button"
          on:click={() => setMode(availableMode)}
        >
          {modeLabels[availableMode]}
        </button>
      {/each}
    </div>
  {/if}

  <div class="surface map-frame" style="padding: 0;">
    <div bind:this={container} class="maplibre-map" aria-hidden="true"></div>
    {#if !ready}
      <MapLoader label={loaderLabel} sublabel={loaderSublabel} />
    {/if}
    {#if markers.length === 0}
      <div class="map-empty">{emptyLabel}</div>
    {/if}
  </div>
</section>
