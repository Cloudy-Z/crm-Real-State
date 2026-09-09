<template>
  <Dialog v-model="show" :options="{ size: '5xl' }">
    <template #body-title>
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
            {{ __('Select Property') }}
          </h3>
          <span
            class="rounded-full bg-surface-blue-2 px-2.5 py-1 text-xs font-medium text-ink-blue-3"
          >
            {{ __(localCategory) }}
          </span>
        </div>
        <p class="mt-1 text-sm text-ink-gray-6">
          {{
            __(
              'Compare properties by location, project, type, price and finishing. SKU is shown only as a reference.',
            )
          }}
        </p>
      </div>
    </template>

    <template #body-content>
      <div class="flex flex-col gap-4">
        <div class="rounded-lg bg-surface-gray-1 p-3">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label
              class="flex flex-col gap-1 text-xs font-medium text-ink-gray-6 xl:col-span-2"
            >
              {{ __('Search') }}
              <input
                v-model="filters.search"
                type="search"
                :placeholder="__('Project, developer, unit type or reference')"
                class="h-9 rounded border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none"
                @keyup.enter="fetchUnits"
              />
            </label>
            <label
              class="flex flex-col gap-1 text-xs font-medium text-ink-gray-6"
            >
              {{ __('Location') }}
              <input
                v-model="filters.location"
                type="text"
                :placeholder="__('Area or location')"
                class="h-9 rounded border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none"
                @keyup.enter="fetchUnits"
              />
            </label>
            <label
              class="flex flex-col gap-1 text-xs font-medium text-ink-gray-6"
            >
              {{ __('Unit Type') }}
              <select
                v-model="filters.unitType"
                class="h-9 rounded border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none"
              >
                <option value="">{{ __('All Types') }}</option>
                <option v-for="type in unitTypes" :key="type" :value="type">
                  {{ __(type) }}
                </option>
              </select>
            </label>
            <label
              class="flex flex-col gap-1 text-xs font-medium text-ink-gray-6"
            >
              {{ __('Project') }}
              <input
                v-model="filters.project"
                type="text"
                :placeholder="__('Project name')"
                class="h-9 rounded border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none"
                @keyup.enter="fetchUnits"
              />
            </label>
            <label
              class="flex flex-col gap-1 text-xs font-medium text-ink-gray-6"
            >
              {{ __('Developer') }}
              <input
                v-model="filters.developer"
                type="text"
                :placeholder="__('Developer name')"
                class="h-9 rounded border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none"
                @keyup.enter="fetchUnits"
              />
            </label>
            <label
              class="flex flex-col gap-1 text-xs font-medium text-ink-gray-6"
            >
              {{ __('Minimum Price') }}
              <input
                v-model="filters.minPrice"
                type="number"
                min="0"
                :placeholder="__('From')"
                class="h-9 rounded border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none"
                @keyup.enter="fetchUnits"
              />
            </label>
            <label
              class="flex flex-col gap-1 text-xs font-medium text-ink-gray-6"
            >
              {{ __('Maximum Price') }}
              <input
                v-model="filters.maxPrice"
                type="number"
                min="0"
                :placeholder="__('To')"
                class="h-9 rounded border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none"
                @keyup.enter="fetchUnits"
              />
            </label>
          </div>

          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs text-ink-gray-5">
              {{ categoryHint }}
            </p>
            <div class="flex gap-2">
              <Button
                :label="__('Clear Filters')"
                variant="subtle"
                @click="clearFilters"
              />
              <Button
                :label="__('Apply Filters')"
                variant="solid"
                :loading="loading"
                @click="fetchUnits"
              />
            </div>
          </div>
        </div>

        <div v-if="loading" class="py-12 text-center text-sm text-ink-gray-6">
          {{ __('Loading matching properties...') }}
        </div>

        <div
          v-else-if="!units.length"
          class="rounded-lg border border-dashed border-outline-gray-2 px-4 py-12 text-center"
        >
          <p class="font-medium text-ink-gray-8">
            {{ __('No matching available properties') }}
          </p>
          <p class="mt-1 text-sm text-ink-gray-5">
            {{ __('Clear one or more filters and search again.') }}
          </p>
        </div>

        <div
          v-else
          class="grid max-h-[460px] grid-cols-1 gap-3 overflow-auto pr-1 lg:grid-cols-2"
        >
          <button
            v-for="unit in units"
            :key="unit.name"
            type="button"
            class="rounded-xl border p-4 text-left transition duration-150 hover:border-outline-gray-4 hover:bg-surface-gray-1 active:scale-[0.99]"
            :class="
              isSelected(unit)
                ? 'border-outline-blue-2 bg-surface-blue-1 ring-1 ring-outline-blue-1'
                : 'border-outline-gray-2 bg-surface-white'
            "
            @click="toggleUnit(unit)"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-base font-semibold text-ink-gray-9">
                  {{ unit.location || __('Location not set') }}
                </p>
                <p class="mt-0.5 truncate text-sm font-medium text-ink-gray-7">
                  {{
                    unit.project_label || unit.project || __('Project not set')
                  }}
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-base font-semibold text-ink-gray-9">
                  {{ formatPrice(unit.price) }}
                </p>
                <p class="text-xs text-ink-gray-5">{{ __('Asking price') }}</p>
              </div>
            </div>

            <div
              class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-surface-gray-1 p-3 text-sm"
            >
              <UnitFact :label="__('Unit Type')" :value="unit.unit_type" />
              <UnitFact :label="__('Developer')" :value="unit.developer" />
              <UnitFact :label="__('Finishing')" :value="unit.finishing_type" />
              <UnitFact
                :label="__('Floor')"
                :value="displayFloor(unit.floor)"
              />
              <UnitFact
                :label="__('Project Status')"
                :value="unit.project_status"
              />
              <UnitFact :label="__('Availability')" :value="unit.status" />
            </div>

            <div class="mt-3 flex items-center justify-between gap-3">
              <span class="text-xs text-ink-gray-5">
                {{ __('Reference') }}: {{ unit.sku || unit.name }}
              </span>
              <span
                class="rounded-full px-2 py-1 text-xs font-medium"
                :class="
                  isSelected(unit)
                    ? 'bg-surface-blue-3 text-ink-white'
                    : 'bg-surface-gray-2 text-ink-gray-7'
                "
              >
                {{ isSelected(unit) ? __('Selected') : __('Select') }}
              </span>
            </div>
          </button>
        </div>

        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
        >
          <div class="text-sm text-ink-gray-6">
            {{ units.length }} {{ __('matching property(s)') }} ·
            {{ selectedUnits.length }} {{ __('selected') }}
          </div>
          <div class="flex gap-2">
            <Button
              :label="__('Cancel')"
              variant="subtle"
              @click="closeDialog"
            />
            <Button
              :label="
                selectionMode === 'single'
                  ? __('Use Selected Property')
                  : __('Add Selected Properties')
              "
              variant="solid"
              :disabled="!selectedUnits.length"
              :loading="submitting"
              @click="submitSelection"
            />
          </div>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { computed, defineComponent, h, reactive, ref, watch } from 'vue'
import { Button, Dialog, call, toast } from 'frappe-ui'

const UnitFact = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], default: null },
  },
  setup(props) {
    return () =>
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'text-xs text-ink-gray-5' }, props.label),
        h(
          'p',
          { class: 'mt-0.5 truncate font-medium text-ink-gray-8' },
          props.value === null ||
            props.value === undefined ||
            props.value === ''
            ? '—'
            : String(props.value),
        ),
      ])
  },
})

const props = defineProps({
  leadId: { type: String, required: true },
  interestCategory: { type: String, default: 'Resale' },
  includeUnit: { type: String, default: '' },
  selectionMode: {
    type: String,
    default: 'single',
    validator: (value) => ['single', 'multiple'].includes(value),
  },
  linkOnSubmit: { type: Boolean, default: false },
})

const emit = defineEmits(['selected', 'units-added', 'cancelled'])
const show = defineModel({ type: Boolean, default: false })
const loading = ref(false)
const submitting = ref(false)
const units = ref([])
const selectedUnits = ref([])
const localCategory = ref(props.interestCategory)
const selectionCommitted = ref(false)
const unitTypes = ['Villa', 'Chalet', 'Apartment', 'Duplex', 'Penthouse']
const filters = reactive({
  search: '',
  location: '',
  project: '',
  developer: '',
  unitType: '',
  minPrice: '',
  maxPrice: '',
})

const categoryHint = computed(() =>
  localCategory.value === 'Resale'
    ? __('Showing seller-owned resale inventory only.')
    : __('Showing open developer inventory without a seller owner only.'),
)

function isSelected(unit) {
  return selectedUnits.value.includes(unit.name)
}

function toggleUnit(unit) {
  if (props.selectionMode === 'single') {
    selectedUnits.value = [unit.name]
    return
  }
  const index = selectedUnits.value.indexOf(unit.name)
  if (index >= 0) selectedUnits.value.splice(index, 1)
  else selectedUnits.value.push(unit.name)
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—'
  return Number(value).toLocaleString()
}

function displayFloor(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function clearFilters() {
  Object.assign(filters, {
    search: '',
    location: '',
    project: '',
    developer: '',
    unitType: '',
    minPrice: '',
    maxPrice: '',
  })
  fetchUnits()
}

async function fetchUnits() {
  loading.value = true
  try {
    const result = await call(
      'real_estate_crm_customs.api.get_available_units_for_selection',
      {
        lead: props.leadId,
        interest_category: localCategory.value,
        search: filters.search || null,
        location: filters.location || null,
        project: filters.project || null,
        developer: filters.developer || null,
        unit_type: filters.unitType || null,
        min_price: filters.minPrice || null,
        max_price: filters.maxPrice || null,
        include_unit: props.includeUnit || null,
      },
    )
    units.value = result || []
    selectedUnits.value = selectedUnits.value.filter((name) =>
      units.value.some((unit) => unit.name === name),
    )
    if (
      props.selectionMode === 'single' &&
      props.includeUnit &&
      units.value.some((unit) => unit.name === props.includeUnit)
    ) {
      selectedUnits.value = [props.includeUnit]
    }
  } catch (error) {
    units.value = []
    toast.error(
      error.messages?.[0] ||
        error.message ||
        __('Could not load matching properties.'),
    )
  } finally {
    loading.value = false
  }
}

async function submitSelection() {
  if (!selectedUnits.value.length) return
  submitting.value = true
  try {
    const selectedRecords = units.value.filter((unit) =>
      selectedUnits.value.includes(unit.name),
    )
    if (props.linkOnSubmit) {
      await call('real_estate_crm_customs.api.link_interested_units', {
        lead: props.leadId,
        units: JSON.stringify(selectedUnits.value),
        interest_category: localCategory.value,
      })
      emit('units-added', selectedRecords)
    } else {
      emit(
        'selected',
        props.selectionMode === 'single' ? selectedRecords[0] : selectedRecords,
      )
    }
    selectionCommitted.value = true
    show.value = false
  } finally {
    submitting.value = false
  }
}

function closeDialog() {
  show.value = false
}

watch(
  () => props.interestCategory,
  (value) => {
    localCategory.value = value || 'Resale'
    selectedUnits.value = []
    if (show.value) fetchUnits()
  },
)

watch(show, (value, previous) => {
  if (value) {
    selectionCommitted.value = false
    selectedUnits.value = props.includeUnit ? [props.includeUnit] : []
    clearFilters()
    return
  }
  if (previous && !selectionCommitted.value) emit('cancelled')
})
</script>
