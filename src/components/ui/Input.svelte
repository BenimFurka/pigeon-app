<script>
  export let label = '';
  export let id = '';
  export let type = 'text';
  export let placeholder = '';
  export let required = false;
  export let value = '';
  export let style = '';
</script>

<div class="input-group">
  <label for={id}>{label}</label>
  <input
    type={type}
    id={id}
    placeholder={placeholder}
    required={required}
    value={value}
    style={style}
  />
</div>

<style>
    label {
        display: block;
        margin: 12px 0 6px;
        color: var(--primary-color);
    }

    input {
        background-color: var(--secondary-color);
        border: 1px solid var(--border-color);
        position: relative;
        padding: 10px 12px;
        border-radius: var(--radius-sm);
        width: 90%;
        min-height: 36px;
        height: 36px;
        justify-self: center;
        font-size: 15px;
        color: var(--text-color);
        transition: var(--transition);
        margin: 0 auto; 
    }
        
    input:focus {
        outline: none;
    }
</style>