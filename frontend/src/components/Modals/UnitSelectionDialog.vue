<template>
  <Dialog v-model="show" :options="{ size: '5xl' }">
    <template #body-title>
      <h3 class="text-2xl font-semibold leading-6 text-ink-gray-9">
        {{ __('Select Inventory Units') }}
      </h3>
      <p class="mt-1 text-sm text-ink-gray-6">
        {{ __('Browse available units and select one or more to add to the buyer interest list.') }}
      </p>
    </template>
    <template #body-content>
      <div class="flex flex-col gap-4">
        <!-- Search / Filter -->
        <div class="flex flex-wrap gap-2">
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="__('Search by SKU, project, developer...')"
            class="flex-1 rounded border border-outline-gray-2 px-3 py-2 text-sm focus:border-surface-gray-4 focus:outline-none"
          />
          <Button
            :label="__('Refresh')"
            variant="subtle"
            @click="fetchUnits"
          />
        </div>
        <!-- Loading state -->
        <div v-if="loading" class="py-8 text-center text-sm text-ink-gray-6">
          {{ __('Loading available units...') }}
        </div>
        <!-- Empty state -->
        <div v-else-if="!filteredUnits.length" class="py-8 text-center text-sm text-ink-gray-6">
          {{ __('No available inventory units found matching your search.') }}
        </div>
        <!-- Units table -->
        <div v-else class="max-h-[400px] overflow-auto rounded border border-outline-gray-1">
          <table class="w-full text-left text-sm">
            <thead class="sticky top-0 border-b bg-surface-gray-1 text-ink-gray-6">
              <tr>
                <th class="px-3 py-2.5 font-medium">
                  <input
                    type="checkbox"
                    :checked="allSelected"
                    :indeterminate="someSelected && !allSelected"
                    @change="toggleAll"
                  />
                </th>
                <th class="px-3 py-2.5 font-medium">{{ __('SKU') }}</th>
                <th class="px-3 py-2.5 font-medium">{{ __('Project') }}</th>
                <th class="px-3 py-2.5 font-medium">{{ __('Developer') }}</th>
                <th class="px-3 py-2.5 font-medium">{{ __('Type') }}</th>
                <th class="px-3 py-2.5 font-medium">{{ __('Floor') }}</th>
                <th class="px-3 py-2.5 font-medium">{{ __('Finishing') }}</th>
                <th class="px-3 py-2.5 font-medium">{{ __('Price') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="unit in filteredUnits"
                :key="unit.name"
                class="cursor-pointer border-b last:border-b-0 hover:bg-surface-gray-1"
                :class="{ 'bg-surface-blue-1': isSelected(unit) }"
                @click="toggleUnit(unit)"
              >
                <td class="px-3 py-2.5">
                  <input
                    type="checkbox"
                    :checked="isSelected(unit)"
                    @click.stop
                    @change="toggleUnit(unit)"
                  />
                </td>
                <td class="px-3 py-2.5 font-medium text-ink-gray-9">
                  {{ unit.sku || unit.name }}
                </td>
                <td class="px-3 py-2.5 text-ink-gray-8">{{ unit.project || '—' }}</td>
                <td class="px-3 py-2.5 text-ink-gray-8">{{ unit.developer || '—' }}</td>
                <td class="px-3 py-2.5 text-ink-gray-8">{{ unit.unit_type || '—' }}</td>
                <td class="px-3 py-2.5 text-ink-gray-8">{{ unit.floor || '—' }}</td>
                <td class="px-3 py-2.5 text-ink-gray-8">{{ unit.finishing_type || '—' }}</td>
                <td class="px-3 py-2.5 text-ink-gray-8">{{ formatPrice(unit.price) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Selection summary and action -->
        <div class="flex items-center justify-between">
          <div class="text-sm text-ink-gray-6">
            {{ selectedUnits.length }} {{ __('unit(s) selected') }}
          </div>
          <div class="flex gap-2">
            <Button :label="__('Cancel')" variant="subtle" @click="show = false" />
            <Button
              :label="__('Add Selected Units')"
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
import { ref, computed, watch } from 'vue'
import { Dialog, call } from 'frappe-ui'

// __ is globally available via window.__ (set by translation plugin)

const props = defineProps({
  leadId: { type: String, required: true },
})

const emit = defineEmits(['units-added'])

const show = defineModel({ type: Boolean, default: false })
const loading = ref(false)
const submitting = ref(false)
const units = ref([])
const selectedUnits = ref([])
const searchQuery = ref('')

const filteredUnits = computed(() => {
  if (!searchQuery.value.trim()) return units.value
  const q = searchQuery.value.toLowerCase()
  return units.value.filter(
    (u) =>
      (u.sku || '').toLowerCase().includes(q) ||
      (u.project || '').toLowerCase().includes(q) ||
      (u.developer || '').toLowerCase().includes(q) ||
      (u.unit_type || '').toLowerCase().includes(q) ||
      (u.name || '').toLowerCase().includes(q),
  )
})

const allSelected = computed(
  () => filteredUnits.value.length > 0 && selectedUnits.value.length === filteredUnits.value.length,
)
const someSelected = computed(() => selectedUnits.value.length > 0)

function isSelected(unit) {
  return selectedUnits.value.includes(unit.name)
}

function toggleUnit(unit) {
  const idx = selectedUnits.value.indexOf(unit.name)
  if (idx >= 0) {
    selectedUnits.value.splice(idx, 1)
  } else {
    selectedUnits.value.push(unit.name)
  }
}

function toggleAll() {
  if (allSelected.value) {
    selectedUnits.value = []
  } else {
    selectedUnits.value = filteredUnits.value.map((u) => u.name)
  }
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—'
  return Number(value).toLocaleString()
}

async function fetchUnits() {
  loading.value = true
  try {
    const result = await call('real_estate_crm_customs.api.get_available_units_for_selection', {
      lead: props.leadId,
    })
    units.value = result || []
  } catch (err) {
    units.value = []
  } finally {
    loading.value = false
  }
}

async function submitSelection() {
  if (!selectedUnits.value.length) return
  submitting.value = true
  try {
    await call('real_estate_crm_customs.api.link_interested_units', {
      lead: props.leadId,
      units: JSON.stringify(selectedUnits.value),
    })
    emit('units-added')
    show.value = false
    selectedUnits.value = []
  } catch (err) {
    // Error handled by caller via toast
  } finally {
    submitting.value = false
  }
}

// Fetch units when dialog opens
watch(show, (val) => {
  if (val) {
    selectedUnits.value = []
    searchQuery.value = ''
    fetchUnits()
  }
})
</script>
