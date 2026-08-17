<template>
  <div class="phone-input flex items-center gap-1 rounded border border-outline-gray-2 bg-surface-white px-2 py-1.5 focus-within:border-outline-gray-4 focus-within:ring-1 focus-within:ring-outline-gray-3 transition-all">
    <!-- Country Code Selector -->
    <div class="relative shrink-0">
      <button
        type="button"
        class="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-surface-gray-2 text-sm"
        @click="showDropdown = !showDropdown"
        :disabled="disabled"
      >
        <span class="text-base leading-none">{{ selectedCountry.flag }}</span>
        <span class="text-ink-gray-5 text-xs">{{ selectedCountry.code }}</span>
        <svg class="h-3 w-3 text-ink-gray-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <!-- Dropdown -->
      <div
        v-if="showDropdown"
        class="absolute left-0 top-full z-50 mt-1 max-h-60 w-64 overflow-auto rounded-lg border border-outline-gray-2 bg-surface-white shadow-lg"
      >
        <div class="sticky top-0 bg-surface-white p-2 border-b border-outline-gray-1">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            class="w-full rounded border border-outline-gray-2 px-2 py-1 text-sm focus:border-outline-gray-4 focus:outline-none"
            :placeholder="__('Search country...')"
            @keydown.esc="showDropdown = false"
          />
        </div>
        <div
          v-for="country in filteredCountries"
          :key="country.code"
          class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-gray-2"
          :class="{ 'bg-surface-gray-3': country.code === selectedCountry.code }"
          @click="selectCountry(country)"
        >
          <span class="text-base leading-none">{{ country.flag }}</span>
          <span class="flex-1 truncate text-ink-gray-7">{{ country.name }}</span>
          <span class="text-ink-gray-4">{{ country.code }}</span>
        </div>
      </div>
    </div>
    <!-- Divider -->
    <div class="h-5 w-px bg-outline-gray-2 shrink-0"></div>
    <!-- Phone Number Input -->
    <input
      ref="phoneInput"
      type="tel"
      class="flex-1 border-none bg-transparent text-sm text-ink-gray-8 placeholder-ink-gray-4 focus:outline-none min-w-0"
      :value="localNumber"
      :placeholder="placeholder || __('Enter phone number')"
      :disabled="disabled"
      @input="onNumberInput($event.target.value)"
      @blur="onBlur"
    />
  </div>
  <!-- Click-outside overlay -->
  <div
    v-if="showDropdown"
    class="fixed inset-0 z-40"
    @click="showDropdown = false"
  ></div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'change'])

const showDropdown = ref(false)
const searchQuery = ref('')
const searchInput = ref(null)
const phoneInput = ref(null)

// Country data with flags, codes, and names
const countries = [
  { code: '+20', flag: '🇪🇬', name: 'Egypt' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon' },
  { code: '+963', flag: '🇸🇾', name: 'Syria' },
  { code: '+964', flag: '🇮🇶', name: 'Iraq' },
  { code: '+212', flag: '🇲🇦', name: 'Morocco' },
  { code: '+216', flag: '🇹🇳', name: 'Tunisia' },
  { code: '+213', flag: '🇩🇿', name: 'Algeria' },
  { code: '+218', flag: '🇱🇾', name: 'Libya' },
  { code: '+249', flag: '🇸🇩', name: 'Sudan' },
  { code: '+970', flag: '🇵🇸', name: 'Palestine' },
  { code: '+967', flag: '🇾🇪', name: 'Yemen' },
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+90', flag: '🇹🇷', name: 'Turkey' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+7', flag: '🇷🇺', name: 'Russia' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines' },
]

// Parse the stored value into country code + local number
const selectedCountry = ref(countries[0]) // Default: Egypt
const localNumber = ref('')

function parsePhoneValue(value) {
  if (!value) {
    selectedCountry.value = countries[0]
    localNumber.value = ''
    return
  }

  // Try to match a country code from the value
  if (value.startsWith('+')) {
    // Sort by code length descending to match longest first (e.g., +971 before +97)
    const sorted = [...countries].sort((a, b) => b.code.length - a.code.length)
    for (const country of sorted) {
      if (value.startsWith(country.code)) {
        selectedCountry.value = country
        localNumber.value = value.slice(country.code.length).replace(/^[\s-]/, '')
        return
      }
    }
    // No match found — keep as-is
    localNumber.value = value
  } else {
    // No + prefix — treat as local number with default country
    localNumber.value = value
  }
}

// Initialize from modelValue
onMounted(() => {
  parsePhoneValue(props.modelValue)
})

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  const currentCombined = getCombinedValue()
  if (newVal !== currentCombined) {
    parsePhoneValue(newVal)
  }
})

// Watch dropdown open to focus search
watch(showDropdown, (val) => {
  if (val) {
    searchQuery.value = ''
    nextTick(() => searchInput.value?.focus())
  }
})

const filteredCountries = computed(() => {
  if (!searchQuery.value) return countries
  const q = searchQuery.value.toLowerCase()
  return countries.filter(
    c => c.name.toLowerCase().includes(q) || c.code.includes(q)
  )
})

function selectCountry(country) {
  selectedCountry.value = country
  showDropdown.value = false
  emitValue()
  nextTick(() => phoneInput.value?.focus())
}

function onNumberInput(value) {
  // Strip non-numeric characters except spaces and dashes for display
  localNumber.value = value.replace(/[^0-9\s\-]/g, '')
  emitValue()
}

function onBlur() {
  emitValue()
}

function getCombinedValue() {
  const num = localNumber.value.replace(/[\s\-]/g, '')
  if (!num) return ''
  return selectedCountry.value.code + num
}

function emitValue() {
  const combined = getCombinedValue()
  emit('update:modelValue', combined)
  emit('change', combined)
}
</script>

<style scoped>
.phone-input:has(input:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
