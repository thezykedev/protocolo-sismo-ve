<script lang="ts">
  export let id: string;
  export let label: string;
  export let placeholder = '';
  export let value = '';
  export let help = '';
  export let onChange: (nextValue: string) => void = () => {};
</script>

<label class="field" for={id}>
  <span class="field__label">{label}</span>
  <input
    class="field__input"
    id={id}
    type="search"
    bind:value
    placeholder={placeholder}
    on:input={() => onChange(value)}
  />
  {#if help}
    <span class="field__help">{help}</span>
  {/if}
</label>
