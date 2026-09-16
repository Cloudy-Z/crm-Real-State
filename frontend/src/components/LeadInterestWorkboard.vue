<template>
  <div class="space-y-4">
    <div
      v-for="interest in rows"
      :key="interest.name"
      class="rounded-xl border border-outline-gray-2 bg-surface-white p-4"
    >
      <div
        class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="truncate font-semibold text-ink-gray-9">
              {{ interest.label }}
            </h4>
            <span
              class="rounded-full px-2.5 py-1 text-xs font-semibold"
              :class="statusClass(interest.workflow_status)"
            >
              {{ __(interest.workflow_status || 'Unknown') }}
            </span>
            <span
              v-if="interest.record_type !== 'Inventory Unit'"
              class="rounded-full bg-surface-amber-1 px-2.5 py-1 text-xs text-ink-amber-3"
            >
              {{ __(interest.record_type || 'Request') }}
            </span>
          </div>
          <p class="mt-1 text-xs text-ink-gray-5">
            {{ interest.name }}
            <template v-if="interest.unit"> · {{ interest.unit }}</template>
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <template v-if="interest.current_action">
            <Button
              :label="currentActionLabel(interest.current_action)"
              variant="solid"
              @click="$emit('execute-action', interest.current_action)"
            />
            <Button
              :label="__('Cancel Action')"
              variant="subtle"
              @click="$emit('cancel-action', interest.current_action)"
            />
          </template>
          <template v-else>
            <Button
              v-for="action in interest.allowed_actions || []"
              :key="`${interest.name}-${action.action_type}-${action.purpose}`"
              :label="action.label"
              :variant="
                action.action_type === 'Offer Decision' ? 'solid' : 'subtle'
              "
              @click="$emit('plan-action', action)"
            />
          </template>
          <Button
            v-if="interest.workflow_status === 'Requested'"
            :label="__('Edit Requirements')"
            variant="subtle"
            @click="$emit('edit', interest)"
          />
          <Button
            v-if="interest.is_active && !interest.deletion_request_status"
            :label="__('Request Deletion')"
            variant="subtle"
            @click="$emit('request-delete', interest)"
          />
          <template
            v-if="
              canReview &&
              interest.deletion_request_status === 'Pending Manager Approval'
            "
          >
            <Button
              :label="__('Approve Deletion')"
              variant="subtle"
              @click="$emit('review', interest, 'Approve')"
            />
            <Button
              :label="__('Reject Deletion')"
              variant="subtle"
              @click="$emit('review', interest, 'Reject')"
            />
          </template>
        </div>
      </div>

      <div class="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <Fact :label="__('Category')" :value="interest.interest_category" />
        <Fact
          :label="__('Unit / Request')"
          :value="
            interest.unit || interest.request_notes || __('Requested Unit')
          "
        />
        <Fact :label="__('Requested Area')" :value="interest.requested_area" />
        <Fact
          :label="__('Requested Type')"
          :value="interest.requested_unit_type"
        />
        <Fact
          :label="__('Requested Budget')"
          :value="formatPrice(interest.requested_budget)"
        />
        <Fact :label="__('Project')" :value="interest.requested_project" />
        <Fact :label="__('Developer')" :value="interest.requested_developer" />
        <Fact
          :label="__('Finishing')"
          :value="interest.requested_finishing_type"
        />
      </div>

      <div
        v-if="interest.current_action"
        class="mt-4 rounded-lg border border-outline-blue-1 bg-surface-blue-1 p-3"
      >
        <p class="text-sm font-medium text-ink-blue-3">
          {{ __('Current Action') }}:
          {{ __(interest.current_action.action_type) }} —
          {{ __(interest.current_action.purpose || '') }}
        </p>
        <p class="mt-1 text-xs text-ink-gray-6">
          {{ __(interest.current_action.workflow_status) }} ·
          {{ interest.current_action.scheduled_start || __('No date') }}
        </p>
      </div>

      <details v-if="interest.transitions?.length" class="mt-4">
        <summary class="cursor-pointer text-sm font-medium text-ink-gray-7">
          {{ __('Recent Interest History') }}
        </summary>
        <div class="mt-2 space-y-2">
          <div
            v-for="(transition, index) in interest.transitions"
            :key="`${interest.name}-${index}`"
            class="flex flex-col gap-1 rounded-lg bg-surface-gray-1 px-3 py-2 text-xs text-ink-gray-6 md:flex-row md:items-center md:justify-between"
          >
            <span>
              {{ transition.from_status || __('Created') }} →
              <strong>{{ transition.to_status }}</strong>
              <template v-if="transition.outcome">
                · {{ transition.outcome }}
              </template>
            </span>
            <span>{{ transition.transitioned_on }}</span>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { Button } from 'frappe-ui'
import { defineComponent, h } from 'vue'

defineProps({
  rows: { type: Array, default: () => [] },
  canReview: { type: Boolean, default: false },
})

defineEmits([
  'execute-action',
  'plan-action',
  'cancel-action',
  'edit',
  'request-delete',
  'review',
])

const Fact = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number], default: '' },
  },
  setup(factProps) {
    return () =>
      h('div', { class: 'rounded-lg bg-surface-gray-1 px-3 py-2' }, [
        h('p', { class: 'text-xs text-ink-gray-5' }, factProps.label),
        h(
          'p',
          { class: 'mt-1 break-words font-medium text-ink-gray-8' },
          factProps.value || __('—'),
        ),
      ])
  },
})

function currentActionLabel(action) {
  if (action.workflow_status === 'In Progress')
    return __('Record {0} Result', [__(action.action_type)])
  return __('Do {0} Now', [__(action.action_type)])
}

function statusClass(status) {
  if (['Shown - Interested', 'Fulfilled'].includes(status))
    return 'bg-surface-green-1 text-ink-green-3'
  if (['Offer Accepted', 'Negotiating', 'Showing Scheduled'].includes(status))
    return 'bg-surface-blue-1 text-ink-blue-3'
  if (['Offer Sent', 'Offer Viewed'].includes(status))
    return 'bg-surface-blue-1 text-ink-blue-3'
  if (['Rejected', 'Superseded', 'Cancelled'].includes(status))
    return 'bg-surface-red-1 text-ink-red-3'
  if (status === 'Requested') return 'bg-surface-amber-1 text-ink-amber-3'
  return 'bg-surface-gray-2 text-ink-gray-7'
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return __('—')
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toLocaleString() : value
}
</script>
