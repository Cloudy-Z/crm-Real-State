<template>
  <section class="rounded border border-outline-gray-1 bg-surface-white p-4">
    <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="text-sm font-medium text-ink-gray-9">
          {{ __('Owner Listing Workflow') }}
        </div>
        <div class="mt-1 text-xs text-ink-gray-6">
          {{ __('Qualify the owner, collect Unit data, agree pricing, verify documents, list the Unit, then validate availability every three months.') }}
        </div>
      </div>
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="rounded bg-surface-gray-2 px-2.5 py-1 text-ink-gray-7">
          {{ __('Stage') }}: {{ context?.lead_status || __('—') }}
        </span>
        <span class="rounded bg-surface-gray-2 px-2.5 py-1 text-ink-gray-7">
          {{ __('Qualification') }}: {{ context?.qualification || __('Unknown') }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="mt-4 rounded bg-surface-gray-1 px-3 py-4 text-sm text-ink-gray-6">
      {{ __('Loading Owner workflow...') }}
    </div>

    <template v-else>
      <div v-if="currentAction" class="mt-4 rounded border border-blue-200 bg-blue-50 p-3">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div class="font-medium text-ink-gray-9">
              {{ currentAction.action_type }} · {{ currentAction.purpose }}
            </div>
            <div class="mt-1 text-xs text-ink-gray-6">
              {{ __('Scheduled') }}: {{ formatDateTime(currentAction.scheduled_start) }}
              <template v-if="currentAction.unit"> · {{ __('Unit') }}: {{ currentAction.unit }}</template>
            </div>
          </div>
          <div class="flex gap-2">
            <Button :label="__('Record result')" variant="solid" @click="$emit('run-action', currentAction)" />
            <Button :label="__('Reschedule')" variant="subtle" @click="$emit('reschedule-action', currentAction)" />
          </div>
        </div>
      </div>

      <div v-else class="mt-4 rounded border border-dashed border-outline-gray-2 p-3">
        <div class="text-sm font-medium text-ink-gray-9">{{ __('No Owner lead action is open') }}</div>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button
            v-for="definition in context?.allowed_actions || []"
            :key="`${definition.action_type}:${definition.purpose}`"
            :label="actionLabel(definition)"
            variant="subtle"
            @click="$emit('run-action', definition)"
          />
          <span v-if="!(context?.allowed_actions || []).length" class="text-sm text-ink-gray-5">
            {{ __('No action is currently available. Complete the open Unit workflow actions or requalify the Owner.') }}
          </span>
        </div>
      </div>

      <div class="mt-4 grid gap-2 text-xs sm:grid-cols-4">
        <div class="rounded bg-surface-gray-1 px-3 py-2 text-ink-gray-7">
          {{ __('Current no-answer streak') }}: {{ context?.call_facts?.no_answer_consecutive_count || 0 }}
        </div>
        <div class="rounded bg-surface-gray-1 px-3 py-2 text-ink-gray-7">
          {{ __('Total no-answer history') }}: {{ context?.call_facts?.no_answer_total_count || 0 }}
        </div>
        <div class="rounded bg-surface-gray-1 px-3 py-2 text-ink-gray-7">
          {{ __('Last call result') }}: {{ context?.call_facts?.last_call_outcome || __('—') }}
        </div>
        <div class="rounded bg-surface-gray-1 px-3 py-2 text-ink-gray-7">
          {{ __('Owned Units') }}: {{ context?.units?.length || 0 }}
        </div>
      </div>

      <div v-if="(context?.units || []).length" class="mt-5 space-y-3">
        <div class="text-sm font-medium text-ink-gray-9">{{ __('Unit Listing Cycles') }}</div>
        <article v-for="unit in context.units" :key="unit.name" class="rounded border border-outline-gray-1 p-3">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <div class="font-medium text-ink-gray-9">{{ unit.unit_number || unit.sku || unit.name }}</div>
              <div class="mt-1 text-xs text-ink-gray-6">
                {{ unit.project || __('No Compound') }} · {{ unit.listing_purpose || __('—') }}
              </div>
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded bg-surface-gray-2 px-2 py-1">{{ __('Listing') }}: {{ unit.listing_status || __('Legacy') }}</span>
                <span class="rounded bg-surface-gray-2 px-2 py-1">{{ __('Availability') }}: {{ unit.availability_status || __('—') }}</span>
                <span class="rounded bg-surface-gray-2 px-2 py-1">{{ __('Active Buyers') }}: {{ unit.active_buyer_interest_count || 0 }}</span>
                <span class="rounded bg-surface-gray-2 px-2 py-1">{{ __('All Buyers') }}: {{ unit.total_buyer_interest_count || 0 }}</span>
              </div>
              <div v-if="unit.next_verification_due" class="mt-2 text-xs text-ink-gray-6">
                {{ __('Next availability verification') }}: {{ formatDate(unit.next_verification_due) }}
              </div>
              <div v-if="unit.listing_gate_errors?.length" class="mt-2 text-xs text-ink-orange-3">
                {{ unit.listing_gate_errors.join(' ') }}
              </div>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <Button v-if="unit.current_action" :label="`${unit.current_action.action_type}: ${unit.current_action.purpose}`" variant="solid" @click="$emit('run-action', unit.current_action)" />
              <Button
                v-if="unit.current_action"
                :label="__('Reschedule')"
                variant="subtle"
                @click="$emit('reschedule-action', unit.current_action)"
              />
              <Button
                v-for="definition in unit.allowed_actions || []"
                :key="`${unit.name}:${definition.action_type}:${definition.purpose}`"
                :label="actionLabel(definition)"
                variant="subtle"
                @click="$emit('run-action', definition)"
              />
              <Button :label="__('Open Unit')" variant="ghost" @click="$emit('open-unit', unit.name)" />
            </div>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Button } from 'frappe-ui'

const props = defineProps({
  context: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

defineEmits(['run-action', 'reschedule-action', 'open-unit'])

const currentAction = computed(() => props.context?.current_action || null)

function actionLabel(definition) {
  return definition?.label || `${definition?.action_type || ''}${definition?.purpose ? ` — ${definition.purpose}` : ''}`
}

function formatDate(value) {
  if (!value) return __('—')
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
}

function formatDateTime(value) {
  if (!value) return __('—')
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
</script>
