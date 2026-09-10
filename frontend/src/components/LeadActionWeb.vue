<template>
  <section class="rounded border border-outline-gray-1 bg-surface-white p-4">
    <div
      class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
    >
      <div>
        <div class="text-sm font-medium text-ink-gray-9">
          {{ __('Action Web') }}
        </div>
        <div class="mt-1 text-xs text-ink-gray-6">
          {{
            __(
              'The next action is calculated from the lead qualification, live interests, offer outcomes, and current workflow action.',
            )
          }}
        </div>
      </div>
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="rounded bg-surface-gray-2 px-2.5 py-1 text-ink-gray-7">
          {{ __('Stage') }}: {{ context?.lead_status || __('—') }}
        </span>
        <span class="rounded bg-surface-gray-2 px-2.5 py-1 text-ink-gray-7">
          {{ __('Qualification') }}:
          {{ context?.qualification || __('Unknown') }}
        </span>
      </div>
    </div>

    <div
      v-if="loading"
      class="mt-4 rounded bg-surface-gray-1 px-3 py-4 text-sm text-ink-gray-6"
    >
      {{ __('Loading workflow context...') }}
    </div>

    <template v-else>
      <div
        v-for="warning in context?.warnings || []"
        :key="warning"
        class="mt-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
      >
        {{ warning }}
      </div>
      <div
        v-for="blocker in context?.blockers || []"
        :key="blocker"
        class="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      >
        {{ blocker }}
      </div>

      <div
        v-if="currentAction"
        class="mt-4 rounded border border-outline-gray-1 bg-surface-gray-1 p-3"
      >
        <div
          class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-ink-gray-9">
                {{ currentAction.action_type }}
              </span>
              <span
                class="rounded bg-surface-white px-2 py-0.5 text-xs font-medium text-ink-gray-7"
              >
                {{ currentAction.workflow_status }}
              </span>
              <span
                v-if="currentAction.is_required"
                class="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                {{ __('Required next action') }}
              </span>
            </div>
            <div class="mt-1 text-sm text-ink-gray-7">
              {{ currentAction.purpose || __('General follow-up') }}
            </div>
            <div class="mt-1 text-xs text-ink-gray-5">
              {{ __('Scheduled') }}:
              {{ formatDateTime(currentAction.scheduled_start) }}
              <template v-if="currentAction.unit">
                · {{ __('Unit') }}: {{ currentAction.unit }}
              </template>
            </div>
          </div>
          <div class="flex shrink-0 flex-wrap gap-2">
            <Button
              :label="
                canExecuteNow
                  ? __('Do {0} now', [currentAction.action_type])
                  : context?.primary_command || __('Record action result')
              "
              variant="solid"
              :disabled="hasBlockers"
              @click="
                $emit(
                  canExecuteNow ? 'execute-action' : 'complete-action',
                  currentAction,
                )
              "
            />
            <Button
              :label="__('Cancel')"
              variant="subtle"
              theme="red"
              @click="$emit('cancel-action', currentAction)"
            />
          </div>
        </div>
      </div>

      <div
        v-else-if="!(context?.warnings || []).length"
        class="mt-4 rounded border border-dashed border-outline-gray-2 p-3"
      >
        <div class="text-sm font-medium text-ink-gray-9">
          {{ __('No required action is open') }}
        </div>
        <div class="mt-1 text-xs text-ink-gray-6">
          {{
            __(
              'Choose an action and run it immediately, or schedule it for later when a calendar date is required.',
            )
          }}
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button
            v-for="definition in context?.allowed_actions || []"
            :key="`${definition.action_type}:${definition.purpose}`"
            :label="definition.label"
            variant="subtle"
            @click="$emit('plan-action', definition)"
          />
          <span
            v-if="!(context?.allowed_actions || []).length"
            class="text-sm text-ink-gray-5"
          >
            {{
              __(
                'No commercial action is available for this lead at the moment.',
              )
            }}
          </span>
        </div>
      </div>

      <div class="mt-4 grid gap-2 text-xs sm:grid-cols-3">
        <div class="rounded bg-surface-gray-1 px-3 py-2 text-ink-gray-7">
          {{ __('Active interests') }}:
          {{ context?.facts?.active_interest_count || 0 }}
        </div>
        <div class="rounded bg-surface-gray-1 px-3 py-2 text-ink-gray-7">
          {{ __('Live offers') }}: {{ context?.facts?.sent_offer_count || 0 }}
        </div>
        <div class="rounded bg-surface-gray-1 px-3 py-2 text-ink-gray-7">
          {{ __('Negotiating units') }}:
          {{ context?.facts?.negotiating_interest_count || 0 }}
        </div>
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

defineEmits([
  'execute-action',
  'complete-action',
  'plan-action',
  'cancel-action',
])

const currentAction = computed(() => props.context?.current_action || null)
const canExecuteNow = computed(() => {
  const status = currentAction.value?.workflow_status
  return ['Planned', 'Due'].includes(status)
})
const hasBlockers = computed(() => (props.context?.blockers || []).length > 0)

function formatDateTime(value) {
  if (!value) return __('—')
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
</script>
