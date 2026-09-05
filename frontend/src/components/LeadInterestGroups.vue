<template>
  <div class="flex flex-col gap-4">
    <section
      v-for="group in groups"
      :key="group.category"
      class="overflow-hidden rounded border border-outline-gray-1 bg-surface-white"
    >
      <header
        class="flex items-center justify-between border-b bg-surface-gray-1 px-4 py-3"
      >
        <div>
          <h3 class="text-sm font-semibold text-ink-gray-9">
            {{ __(group.category) }}
          </h3>
          <p class="text-xs text-ink-gray-5">
            {{ categoryDescription(group.category) }}
          </p>
        </div>
        <span
          class="rounded bg-surface-white px-2 py-1 text-xs text-ink-gray-6"
          >{{ group.rows.length }}</span
        >
      </header>
      <div class="divide-y divide-outline-gray-1">
        <article
          v-for="row in group.rows"
          :key="row.interest_row_name || row.name"
          class="p-4"
        >
          <div
            class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
          >
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <a
                  v-if="row.interest_record_type === 'Inventory Unit'"
                  :href="unitHref(row.name)"
                  target="_blank"
                  class="font-medium text-ink-blue-4 hover:underline"
                >
                  {{ row.sku || row.name }}
                </a>
                <span v-else class="font-medium text-ink-gray-9">{{
                  recordTitle(row)
                }}</span>
                <span
                  class="rounded bg-surface-gray-2 px-2 py-0.5 text-xs text-ink-gray-6"
                >
                  {{
                    row.unit_interest_status ||
                    row.request_status ||
                    row.proposal_status ||
                    __('Active')
                  }}
                </span>
                <span
                  v-if="row.deletion_request_status"
                  class="rounded bg-ink-orange-1 px-2 py-0.5 text-xs font-medium text-ink-orange-4"
                >
                  {{ __(row.deletion_request_status) }}
                </span>
              </div>
              <div
                class="mt-2 grid gap-x-6 gap-y-1 text-xs text-ink-gray-6 sm:grid-cols-2 xl:grid-cols-4"
              >
                <span v-for="detail in recordDetails(row)" :key="detail.label">
                  <strong class="font-medium text-ink-gray-7"
                    >{{ detail.label }}:</strong
                  >
                  {{ detail.value || __('—') }}
                </span>
              </div>
            </div>
            <div
              v-if="row.interest_row_name"
              class="flex shrink-0 flex-wrap gap-2"
            >
              <Button
                :label="__('Edit')"
                variant="subtle"
                @click="$emit('edit', row)"
              />
              <Button
                v-if="!row.deletion_request_status"
                :label="__('Request Deletion')"
                variant="subtle"
                theme="red"
                @click="$emit('request-delete', row)"
              />
              <template
                v-if="
                  canReview &&
                  row.deletion_request_status === 'Pending Manager Approval'
                "
              >
                <Button
                  :label="__('Approve Delete')"
                  variant="solid"
                  theme="red"
                  @click="$emit('review', row, 'Approve')"
                />
                <Button
                  :label="__('Reject')"
                  variant="subtle"
                  @click="$emit('review', row, 'Reject')"
                />
              </template>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  rows: { type: Array, default: () => [] },
  canReview: { type: Boolean, default: false },
})

defineEmits(['edit', 'request-delete', 'review'])

const categories = [
  'Resale',
  'Primary',
  'Brokerage Request',
  'International',
  'Outsource',
]
const groups = computed(() =>
  categories
    .map((category) => ({
      category,
      rows: props.rows.filter(
        (row) => (row.interest_category || 'Resale') === category,
      ),
    }))
    .filter((group) => group.rows.length),
)

function categoryDescription(category) {
  return {
    Resale: __('Seller-owned units from resale inventory.'),
    Primary: __(
      'Available developer inventory, excluding seller-owned resale units.',
    ),
    'Brokerage Request': __(
      'Requirements that are not currently matched to inventory.',
    ),
    International: __(
      'International real estate, stocks, or charity requests by country.',
    ),
    Outsource: __('Units supplied by an external company or broker.'),
  }[category]
}

function recordTitle(row) {
  if (row.interest_category === 'International') {
    return [row.international_type, row.international_country]
      .filter(Boolean)
      .join(' — ')
  }
  if (row.interest_category === 'Outsource')
    return row.outsource_company || __('Outsource Unit')
  return row.request_notes || __(row.interest_category || 'Interest')
}

function recordDetails(row) {
  if (row.interest_record_type === 'Inventory Unit') {
    return [
      { label: __('Unit'), value: row.name },
      { label: __('Project'), value: row.project },
      { label: __('Developer'), value: row.developer },
      { label: __('Price'), value: row.price },
      { label: __('Type'), value: row.unit_type },
      { label: __('Finishing'), value: row.finishing_type },
      { label: __('Offer'), value: row.proposal_status || __('Not Sent') },
    ]
  }
  if (row.interest_category === 'International') {
    return [
      { label: __('Category'), value: row.international_type },
      { label: __('Country'), value: row.international_country },
      { label: __('Details'), value: row.international_details },
    ]
  }
  if (row.interest_category === 'Outsource') {
    return [
      { label: __('Company'), value: row.outsource_company },
      { label: __('Broker'), value: row.outsource_broker_name },
      { label: __('Broker Phone'), value: row.outsource_broker_number },
      { label: __('Details'), value: row.outsource_unit_details },
    ]
  }
  return [
    { label: __('Requirements'), value: row.request_notes },
    { label: __('Request Status'), value: row.request_status },
  ]
}

function unitHref(name) {
  return `/app/real-estate-unit/${encodeURIComponent(name)}`
}
</script>
