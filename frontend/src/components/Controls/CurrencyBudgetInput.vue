<template>
  <label class="field-label">
    {{ label }}<span v-if="required"> *</span>
    <div class="relative">
      <input
        :value="displayValue"
        type="text"
        inputmode="decimal"
        :required="required"
        :disabled="disabled"
        :aria-invalid="invalid || undefined"
        class="field-input pr-16 disabled:cursor-not-allowed disabled:bg-surface-gray-1"
        @input="onInput"
        @blur="formatOnBlur"
      />
      <span
        class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-ink-gray-5"
      >
        {{ currency || __('Currency') }}
      </span>
    </div>
    <span v-if="invalid" class="mt-1 block text-xs text-ink-red-3">
      {{ __('Enter a zero or positive monetary amount.') }}
    </span>
    <span v-else-if="hint" class="mt-1 block text-xs text-ink-gray-5">
      {{ hint }}
    </span>
  </label>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { normalizeCurrencyAmount } from '@/utils/interestWorkflow'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  label: { type: String, required: true },
  currency: { type: String, default: '' },
  hint: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'validity-change'])
const editing = ref(false)
const rawValue = ref(props.modelValue ?? '')

watch(
  () => props.modelValue,
  (value) => {
    if (!editing.value) rawValue.value = value ?? ''
  },
)

const parsed = computed(() => normalizeCurrencyAmount(rawValue.value))
const invalid = computed(
  () => rawValue.value !== '' && rawValue.value !== null && parsed.value === null,
)
const displayValue = computed(() => {
  if (editing.value) return rawValue.value
  if (rawValue.value === '' || rawValue.value === null) return ''
  return parsed.value === null
    ? rawValue.value
    : parsed.value.toLocaleString('en-US', { maximumFractionDigits: 2 })
})

watch(
  invalid,
  (value) => emit('validity-change', !value),
  { immediate: true },
)

function onInput(event) {
  editing.value = true
  rawValue.value = event.target.value
  const amount = normalizeCurrencyAmount(rawValue.value)
  emit('update:modelValue', amount === null ? rawValue.value : amount)
}

function formatOnBlur() {
  editing.value = false
  const amount = normalizeCurrencyAmount(rawValue.value)
  if (amount !== null) {
    rawValue.value = amount
    emit('update:modelValue', amount)
  }
}
</script>
