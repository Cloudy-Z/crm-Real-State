<template>
  <div>
    <div
      class="phone-input flex items-center gap-1 rounded border bg-surface-white px-2 py-1.5 transition-all"
      :class="[
        validationError
          ? 'border-ink-red-3 focus-within:border-ink-red-4 focus-within:ring-1 focus-within:ring-ink-red-2'
          : 'border-outline-gray-2 focus-within:border-outline-gray-4 focus-within:ring-1 focus-within:ring-outline-gray-3'
      ]"
    >
      <!-- Country Code Selector -->
      <div class="relative shrink-0">
        <button
          type="button"
          class="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-surface-gray-2 text-sm"
          @click="showDropdown = !showDropdown"
          :disabled="disabled"
        >
          <span class="text-base leading-none">{{ selectedCountry.flag }}</span>
          <span class="text-ink-gray-5 text-xs">{{ selectedCountry.dialCode }}</span>
          <svg class="h-3 w-3 text-ink-gray-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <!-- Dropdown -->
        <div
          v-if="showDropdown"
          class="absolute left-0 top-full z-50 mt-1 max-h-60 w-72 overflow-auto rounded-lg border border-outline-gray-2 bg-surface-white shadow-lg"
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
            :key="country.iso"
            class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-gray-2"
            :class="{ 'bg-surface-gray-3': country.iso === selectedCountry.iso }"
            @click="selectCountry(country)"
          >
            <span class="text-base leading-none">{{ country.flag }}</span>
            <span class="flex-1 truncate text-ink-gray-7">{{ country.name }}</span>
            <span class="text-ink-gray-4">{{ country.dialCode }}</span>
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
    <!-- Validation Error Message -->
    <p v-if="validationError" class="mt-1 text-xs text-ink-red-4">
      {{ validationError }}
    </p>
    <!-- Click-outside overlay -->
    <div
      v-if="showDropdown"
      class="fixed inset-0 z-40"
      @click="showDropdown = false"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { parsePhoneNumber, isValidPhoneNumber, getExampleNumber } from 'libphonenumber-js'

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
const validationError = ref('')

// Country data with ISO codes for libphonenumber-js validation
const countries = [
  { iso: 'EG', dialCode: '+20', flag: '🇪🇬', name: 'Egypt' },
  { iso: 'SA', dialCode: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { iso: 'AE', dialCode: '+971', flag: '🇦🇪', name: 'UAE' },
  { iso: 'QA', dialCode: '+974', flag: '🇶🇦', name: 'Qatar' },
  { iso: 'BH', dialCode: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { iso: 'OM', dialCode: '+968', flag: '🇴🇲', name: 'Oman' },
  { iso: 'KW', dialCode: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { iso: 'JO', dialCode: '+962', flag: '🇯🇴', name: 'Jordan' },
  { iso: 'LB', dialCode: '+961', flag: '🇱🇧', name: 'Lebanon' },
  { iso: 'SY', dialCode: '+963', flag: '🇸🇾', name: 'Syria' },
  { iso: 'IQ', dialCode: '+964', flag: '🇮🇶', name: 'Iraq' },
  { iso: 'MA', dialCode: '+212', flag: '🇲🇦', name: 'Morocco' },
  { iso: 'TN', dialCode: '+216', flag: '🇹🇳', name: 'Tunisia' },
  { iso: 'DZ', dialCode: '+213', flag: '🇩🇿', name: 'Algeria' },
  { iso: 'LY', dialCode: '+218', flag: '🇱🇾', name: 'Libya' },
  { iso: 'SD', dialCode: '+249', flag: '🇸🇩', name: 'Sudan' },
  { iso: 'PS', dialCode: '+970', flag: '🇵🇸', name: 'Palestine' },
  { iso: 'YE', dialCode: '+967', flag: '🇾🇪', name: 'Yemen' },
  { iso: 'US', dialCode: '+1', flag: '🇺🇸', name: 'United States' },
  { iso: 'GB', dialCode: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { iso: 'DE', dialCode: '+49', flag: '🇩🇪', name: 'Germany' },
  { iso: 'FR', dialCode: '+33', flag: '🇫🇷', name: 'France' },
  { iso: 'IT', dialCode: '+39', flag: '🇮🇹', name: 'Italy' },
  { iso: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'Spain' },
  { iso: 'NL', dialCode: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { iso: 'TR', dialCode: '+90', flag: '🇹🇷', name: 'Turkey' },
  { iso: 'IN', dialCode: '+91', flag: '🇮🇳', name: 'India' },
  { iso: 'PK', dialCode: '+92', flag: '🇵🇰', name: 'Pakistan' },
  { iso: 'CN', dialCode: '+86', flag: '🇨🇳', name: 'China' },
  { iso: 'JP', dialCode: '+81', flag: '🇯🇵', name: 'Japan' },
  { iso: 'KR', dialCode: '+82', flag: '🇰🇷', name: 'South Korea' },
  { iso: 'AU', dialCode: '+61', flag: '🇦🇺', name: 'Australia' },
  { iso: 'RU', dialCode: '+7', flag: '🇷🇺', name: 'Russia' },
  { iso: 'BR', dialCode: '+55', flag: '🇧🇷', name: 'Brazil' },
  { iso: 'ZA', dialCode: '+27', flag: '🇿🇦', name: 'South Africa' },
  { iso: 'NG', dialCode: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { iso: 'KE', dialCode: '+254', flag: '🇰🇪', name: 'Kenya' },
  { iso: 'MY', dialCode: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { iso: 'SG', dialCode: '+65', flag: '🇸🇬', name: 'Singapore' },
  { iso: 'PH', dialCode: '+63', flag: '🇵🇭', name: 'Philippines' },
]

// Parse the stored value into country + local number
const selectedCountry = ref(countries[0]) // Default: Egypt
const localNumber = ref('')

function parsePhoneValue(value) {
  if (!value) {
    selectedCountry.value = countries[0]
    localNumber.value = ''
    validationError.value = ''
    return
  }

  // Frappe Desk stores as +CC-XXXXXXXXXX (e.g. +20-1070009839)
  if (value.includes('-')) {
    const parts = value.split('-')
    const dialCode = parts[0] // e.g. "+20"
    const number = parts.slice(1).join('') // e.g. "1070009839"
    const country = findCountryByDialCode(dialCode)
    if (country) {
      selectedCountry.value = country
      localNumber.value = number
      validateNumber()
      return
    }
  }

  // Fallback: try to parse with libphonenumber-js
  if (value.startsWith('+')) {
    try {
      const parsed = parsePhoneNumber(value)
      if (parsed && parsed.country) {
        const country = countries.find(c => c.iso === parsed.country)
        if (country) {
          selectedCountry.value = country
          localNumber.value = parsed.nationalNumber
          validateNumber()
          return
        }
      }
    } catch (e) {
      // Parse failed — try manual matching
    }

    // Manual matching by dial code (longest match first)
    const sorted = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length)
    for (const country of sorted) {
      if (value.startsWith(country.dialCode)) {
        selectedCountry.value = country
        localNumber.value = value.slice(country.dialCode.length).replace(/^[\s-]/, '')
        validateNumber()
        return
      }
    }
  }

  // No + prefix — treat as local number with current country
  localNumber.value = value.replace(/[^0-9]/g, '')
  validateNumber()
}

function findCountryByDialCode(dialCode) {
  // Sort by length descending to match +971 before +97
  const sorted = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length)
  return sorted.find(c => c.dialCode === dialCode)
}

// Validate using libphonenumber-js
function validateNumber() {
  const num = localNumber.value.replace(/[\s\-]/g, '')
  if (!num) {
    validationError.value = ''
    return
  }

  const fullNumber = selectedCountry.value.dialCode + num
  try {
    const valid = isValidPhoneNumber(fullNumber, selectedCountry.value.iso)
    if (valid) {
      validationError.value = ''
    } else {
      // Try to give a helpful message
      const parsed = parsePhoneNumber(fullNumber, selectedCountry.value.iso)
      if (parsed && !parsed.isValid()) {
        if (parsed.isPossible()) {
          validationError.value = __('Phone number format may be incorrect for {0}', [selectedCountry.value.name])
        } else {
          validationError.value = __('Invalid phone number length for {0}', [selectedCountry.value.name])
        }
      } else {
        validationError.value = __('Invalid phone number for {0}', [selectedCountry.value.name])
      }
    }
  } catch (e) {
    validationError.value = __('Invalid phone number')
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
    c => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.iso.toLowerCase().includes(q)
  )
})

function selectCountry(country) {
  selectedCountry.value = country
  showDropdown.value = false
  validateNumber()
  emitValue()
  nextTick(() => phoneInput.value?.focus())
}

function onNumberInput(value) {
  // Allow only digits
  localNumber.value = value.replace(/[^0-9]/g, '')
  validateNumber()
  emitValue()
}

function onBlur() {
  validateNumber()
  emitValue()
}

function getCombinedValue() {
  const num = localNumber.value.replace(/[\s\-]/g, '')
  if (!num) return ''
  // Store in Frappe Desk Phone format: +CC-XXXXXXXXXX
  return selectedCountry.value.dialCode + '-' + num
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
