<script lang="ts">
  export let label: string;
  export let tone: 'approved' | 'pending' | 'review' | 'verified' | 'quiet' | 'ready' = 'quiet';
</script>

<span class={`status-pill status-pill--${tone}`}>{label}</span>
