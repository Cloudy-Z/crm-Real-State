<template>
  <div class="flex flex-1 flex-col overflow-hidden">
    <div class="border-b px-5 py-3">
      <div class="text-base font-medium text-ink-gray-9">
        {{ __('Event Smart View') }}
      </div>
      <div class="text-sm text-ink-gray-6">
        {{
          __('Actions are prioritized by urgency, then by business importance.')
        }}
      </div>
    </div>
    <div class="flex-1 overflow-auto p-5">
      <div
        v-if="resource.loading"
        class="rounded border border-outline-gray-1 p-5 text-sm text-ink-gray-6"
      >
        {{ __('Loading events…') }}
      </div>
      <div
        v-else-if="!events.length"
        class="rounded border border-outline-gray-1 p-5 text-sm text-ink-gray-6"
      >
        {{ __('No dated actions found for this lead.') }}
      </div>
      <div v-else class="flex flex-col gap-5">
        <section
          v-for="group in groupedEvents"
          v-show="group.items.length"
          :key="group.name"
        >
          <div class="mb-2 flex items-center gap-2">
            <span class="h-2.5 w-2.5 rounded-full" :class="group.dotClass" />
            <h3 class="text-sm font-semibold text-ink-gray-8">
              {{ __(group.name) }}
            </h3>
            <span
              class="rounded bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
              >{{ group.items.length }}</span
            >
          </div>
          <div
            class="overflow-hidden rounded border border-outline-gray-1 bg-surface-white"
          >
            <article
              v-for="event in group.items"
              :key="event.name"
              class="flex flex-col gap-2 border-b p-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
            >
              <div class="min-w-0">
                <div class="truncate text-sm font-medium text-ink-gray-9">
                  {{ event.subject }}
                </div>
                <div class="mt-1 text-xs text-ink-gray-5">
                  {{ event.description || __('No notes') }}
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-3 text-xs">
                <span
                  class="rounded bg-surface-gray-2 px-2 py-1 text-ink-gray-7"
                  >{{ formatEventDate(event.starts_on) }}</span
                >
                <span class="font-medium text-ink-gray-6">{{
                  event.status || __('Open')
                }}</span>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { createResource } from 'frappe-ui'

const props = defineProps({
  leadId: { type: String, required: true },
})

const resource = createResource({
  url: 'real_estate_crm_customs.api.get_lead_smart_events',
  params: { lead: props.leadId },
  cache: ['leadSmartEvents', props.leadId],
  auto: true,
})

const events = computed(() => resource.data || [])
const groupDefinitions = [
  { name: 'Overdue', dotClass: 'bg-ink-red-4' },
  { name: 'Today', dotClass: 'bg-ink-orange-4' },
  { name: 'Upcoming', dotClass: 'bg-ink-blue-4' },
  { name: 'Completed', dotClass: 'bg-ink-green-4' },
]
const groupedEvents = computed(() =>
  groupDefinitions.map((group) => ({
    ...group,
    items: events.value.filter((event) => event.priority_bucket === group.name),
  })),
)

function formatEventDate(value) {
  if (!value) return __('No date')
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

defineExpose({ reload: () => resource.reload() })
</script>
