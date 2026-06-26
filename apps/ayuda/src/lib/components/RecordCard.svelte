<script lang="ts">
  import StatusPill from './StatusPill.svelte';

  export let title: string;
  export let description = '';
  export let meta = '';
  export let href: string | null = null;
  export let status = '';
  export let tone: 'approved' | 'pending' | 'review' | 'verified' | 'quiet' | 'ready' = 'quiet';
</script>

<article class="card">
  {#if status}
    <StatusPill {tone} label={status} />
  {/if}
  <h3>{title}</h3>
  {#if meta}
    <p class="small-mono">{meta}</p>
  {/if}
  {#if description}
    <p>{description}</p>
  {/if}
  {#if href}
    <a class="button-brutal" href={href}>Abrir</a>
  {/if}
</article>
