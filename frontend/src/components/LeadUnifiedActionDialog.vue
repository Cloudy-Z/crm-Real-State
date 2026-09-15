<template>
  <Dialog v-model="show" :options="{ size: '5xl' }">
    <template #body-title>
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-xl font-semibold text-ink-gray-9">
            {{ dialogTitle }}
          </h3>
          <span
            class="rounded-full bg-surface-blue-2 px-2.5 py-1 text-xs font-medium text-ink-blue-3"
          >
            {{ actionType }}
          </span>
        </div>
        <p class="mt-1 text-sm text-ink-gray-6">
          {{
            __('Complete the visible sections, then submit the action once.')
          }}
        </p>
      </div>
    </template>

    <template #body-content>
      <form class="flex max-h-[76vh] flex-col" @submit.prevent="submitBundle">
        <div class="flex-1 space-y-5 overflow-y-auto pr-1">
          <section v-if="isNewAction && canSchedule" class="action-section">
            <SectionTitle
              :number="1"
              :title="__('Timing')"
              :description="
                __(
                  'Choose whether to perform this action now or place it on the calendar.',
                )
              "
            />
            <div class="grid gap-3 md:grid-cols-2">
              <SelectField
                v-model="draft.executionTiming"
                :label="__('Action Timing')"
                :options="['Do Now', 'Schedule for Later']"
                required
              />
              <label
                v-if="draft.executionTiming === 'Schedule for Later'"
                class="field-label"
              >
                {{ __('Scheduled Date & Time') }} *
                <input
                  v-model="draft.scheduledStart"
                  type="datetime-local"
                  class="field-input"
                  required
                />
              </label>
            </div>
          </section>

          <section
            v-if="!isNewAction"
            class="rounded-xl border border-outline-amber-2 bg-surface-amber-1 p-4"
          >
            <label class="flex cursor-pointer items-start gap-3">
              <input
                v-model="draft.cancelAction"
                type="checkbox"
                class="mt-1"
              />
              <span>
                <span class="block text-sm font-medium text-ink-amber-3">
                  {{ __('Cancel this action') }}
                </span>
                <span class="text-xs text-ink-gray-6">
                  {{
                    __(
                      'Cancellation is saved only with the final submission; notes remain optional.',
                    )
                  }}
                </span>
              </span>
            </label>
          </section>

          <section
            v-if="isOwnerMeeting && !draft.cancelAction"
            class="action-section"
          >
            <SectionTitle
              :number="isNewAction ? 2 : 1"
              :title="__('Resale Owner Context')"
              :description="
                __('Meeting with Owner is limited to one active Resale unit.')
              "
            />
            <SelectField
              v-model="draft.ownerInterestRow"
              :label="__('Resale Unit / Owner')"
              :options="ownerInterestOptions"
              :option-labels="rowLabels"
              required
            />
          </section>

          <section v-if="isNewAction && isShowing" class="action-section">
            <SectionTitle
              :number="isNewAction ? 2 : 1"
              :title="__('Showing Unit')"
              :description="
                __('A showing must target exactly one accepted offer unit.')
              "
            />
            <SelectField
              v-model="draft.showingInterestRow"
              :label="__('Accepted Offer Unit')"
              :options="scopedRows.map((row) => row.name)"
              :option-labels="rowLabels"
              required
            />
          </section>

          <section v-if="showResultSections" class="action-section">
            <SectionTitle
              :number="resultSectionNumber"
              :title="resultSectionTitle"
              :description="resultSectionDescription"
            />

            <div v-if="isCall" class="space-y-4">
              <div
                class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-gray-1 p-3"
              >
                <div>
                  <p class="text-sm font-medium text-ink-gray-8">
                    {{ __('Call the Lead') }}
                  </p>
                  <p class="text-xs text-ink-gray-5">
                    {{
                      __('The form stays open while the device dialer starts.')
                    }}
                  </p>
                </div>
                <Button
                  type="button"
                  :label="callStarted ? __('Call Started') : __('Start Call')"
                  :variant="callStarted ? 'subtle' : 'solid'"
                  @click="startCall"
                />
              </div>
              <SelectField
                v-model="draft.contactResult"
                :label="__('Contact Result')"
                :options="[
                  'Answered',
                  'No Answer',
                  'Wrong Number',
                  'Invalid / Disconnected',
                ]"
                required
              />
              <SelectField
                v-if="
                  isInitialQualification && draft.contactResult === 'Answered'
                "
                v-model="draft.qualification"
                :label="__('Qualification Outcome')"
                :options="['Interested', 'Not Interested']"
                required
              />
              <SelectField
                v-if="isOfferFollowUp && draft.contactResult === 'Answered'"
                v-model="draft.outcome"
                :label="__('Offer Follow-up Outcome')"
                :options="[
                  'Viewed',
                  'Offer Accepted',
                  'Rejected',
                  'Needs Alternatives',
                ]"
                required
              />
              <InterestRowChecks
                v-if="
                  isOfferFollowUp &&
                  draft.contactResult === 'Answered' &&
                  ['Viewed', 'Offer Accepted', 'Rejected'].includes(
                    draft.outcome,
                  )
                "
                v-model="draft.selectedInterestRows"
                :rows="scopedRows"
                :label="__('Offer units affected by this result')"
              />
              <SelectField
                v-if="isGeneralCall && draft.contactResult === 'Answered'"
                v-model="draft.outcome"
                :label="__('Follow-up Outcome')"
                :options="[
                  'Completed',
                  'Needs Callback',
                  'Confirmed',
                  'Cancelled',
                ]"
                required
              />
            </div>

            <div v-else-if="isMeeting" class="grid gap-3 md:grid-cols-2">
              <SelectField
                v-model="draft.outcome"
                :label="__('Meeting Outcome')"
                :options="['Done', 'No Show', 'Cancelled', 'Rescheduled']"
                required
              />
              <label v-if="draft.outcome === 'Rescheduled'" class="field-label">
                {{ __('Reschedule To') }} *
                <input
                  v-model="draft.rescheduleTo"
                  type="datetime-local"
                  class="field-input"
                  required
                />
              </label>
              <label
                v-if="isExploreMeeting && draft.outcome === 'Done'"
                class="flex items-center gap-2 self-end pb-2 text-sm font-medium text-ink-gray-7"
              >
                <input v-model="draft.updateInterest" type="checkbox" />
                {{ __('Update buyer requirements in this meeting') }}
              </label>
            </div>

            <div v-else-if="isShowing" class="grid gap-3 md:grid-cols-2">
              <SelectField
                v-model="draft.outcome"
                :label="__('Showing Outcome')"
                :options="[
                  'Completed',
                  'Buyer No Show',
                  'Seller/Unit Unavailable',
                  'Cancelled',
                  'Rescheduled',
                ]"
                required
              />
              <SelectField
                v-if="draft.outcome === 'Completed'"
                v-model="draft.unitOutcome"
                :label="__('Unit Outcome')"
                :options="[
                  'Interested',
                  'Considering',
                  'Rejected',
                  'No Feedback',
                ]"
                required
              />
              <label v-if="draft.outcome === 'Rescheduled'" class="field-label">
                {{ __('Reschedule To') }} *
                <input
                  v-model="draft.rescheduleTo"
                  type="datetime-local"
                  class="field-input"
                  required
                />
              </label>
            </div>

            <div v-else-if="isOfferDecision" class="space-y-4">
              <SelectField
                v-model="draft.offerDecision"
                :label="__('Lead Decision')"
                :options="['Select an Offer', 'Change Requirements']"
                required
              />
              <SelectField
                v-if="draft.offerDecision === 'Select an Offer'"
                v-model="draft.selectedOffer"
                :label="__('Selected Offer')"
                :options="offerRowOptions"
                :option-labels="rowLabels"
                required
              />
              <p
                v-if="draft.offerDecision === 'Change Requirements'"
                class="rounded-lg bg-surface-amber-1 p-3 text-sm text-ink-amber-3"
              >
                {{
                  __(
                    'The current live offers will be retained as history and marked superseded when this form is submitted.',
                  )
                }}
              </p>
            </div>

            <div v-else-if="isSendOffer" class="space-y-4">
              <InterestRowChecks
                v-model="draft.selectedInterestRows"
                :rows="scopedRows"
                :label="__('Units included in this WhatsApp offer')"
              />
            </div>

            <div v-else-if="isNegotiation" class="space-y-4">
              <SelectField
                v-model="draft.outcome"
                :label="__('Negotiation Outcome')"
                :options="[
                  'Continuing',
                  'Terms Changed',
                  'Accepted',
                  'Declined',
                ]"
                required
              />
              <InterestRowChecks
                v-model="draft.selectedInterestRows"
                :rows="scopedRows"
                :label="__('Negotiating units')"
              />
            </div>
          </section>

          <section v-if="showInterestBlock" class="action-section">
            <SectionTitle
              :number="interestSectionNumber"
              :title="__('Interest Requirements')"
              :description="
                __(
                  'Requirements remain in this draft until the final action submission.',
                )
              "
            />
            <div class="grid gap-3 md:grid-cols-2">
              <SelectField
                v-model="draft.interestCategory"
                :label="__('Interest Category')"
                :options="[
                  'Resale',
                  'Primary',
                  'Brokerage Request',
                  'International',
                ]"
                required
              />
              <template v-if="isInventoryInterest">
                <SelectField
                  v-model="draft.preferredArea"
                  :label="__('Preferred Location / Area')"
                  :options="filterOptions.locations"
                  allow-custom
                  required
                />
                <SelectField
                  v-model="draft.preferredUnitType"
                  :label="__('Preferred Unit Type')"
                  :options="filterOptions.unitTypes"
                  required
                />
                <label class="field-label">
                  {{ __('Maximum Budget') }} *
                  <input
                    v-model="draft.buyerBudget"
                    type="number"
                    min="0"
                    class="field-input"
                    required
                  />
                </label>
                <LinkControl
                  v-model="draft.preferredProject"
                  doctype="Real Estate Project"
                  :label="__('Preferred Project')"
                  :placeholder="__('Select a project')"
                />
                <LinkControl
                  v-model="draft.preferredDeveloper"
                  doctype="Property Developer"
                  :label="__('Preferred Developer')"
                  :placeholder="__('Select a developer')"
                />
                <SelectField
                  v-model="draft.preferredFinishing"
                  :label="__('Preferred Finishing')"
                  :options="filterOptions.finishingTypes"
                />
                <label class="field-label">
                  {{ __('Preferred Delivery Time') }}
                  <input
                    v-model="draft.preferredDelivery"
                    type="text"
                    class="field-input"
                  />
                </label>
              </template>

              <template v-if="draft.interestCategory === 'Brokerage Request'">
                <label class="field-label md:col-span-2">
                  {{ __('Brokerage Requirements') }} *
                  <textarea
                    v-model="draft.requestNotes"
                    rows="3"
                    class="field-input h-auto py-2"
                    required
                  />
                </label>
              </template>

              <template v-if="draft.interestCategory === 'International'">
                <SelectField
                  v-model="draft.internationalType"
                  :label="__('International Category')"
                  :options="['Stocks', 'Charity Work', 'Real Estate']"
                  required
                />
                <LinkControl
                  v-model="draft.internationalCountry"
                  doctype="Country"
                  :label="__('Country')"
                  :placeholder="__('Select a country')"
                />
                <label class="field-label md:col-span-2">
                  {{ __('International Request Details') }}
                  <textarea
                    v-model="draft.internationalDetails"
                    rows="3"
                    class="field-input h-auto py-2"
                  />
                </label>
              </template>
            </div>
          </section>

          <section v-if="showSmartMatch" class="action-section">
            <SectionTitle
              :number="smartMatchSectionNumber"
              :title="__('Smart Match')"
              :description="
                __(
                  'Matches use the unsaved requirements above. Select multiple units or record an unmatched Requested Unit.',
                )
              "
            />
            <div
              class="mb-3 flex flex-wrap items-end gap-3 rounded-lg bg-surface-gray-1 p-3"
            >
              <label class="field-label min-w-52 flex-1">
                {{ __('Search inventory') }}
                <input
                  v-model="draft.matchSearch"
                  type="search"
                  class="field-input"
                  :placeholder="__('Location, project, developer or reference')"
                  @keyup.enter.prevent="loadMatches"
                />
              </label>
              <label
                class="flex items-center gap-2 pb-2 text-sm text-ink-gray-7"
              >
                <input v-model="draft.strictFilters" type="checkbox" />
                {{ __('Exact filters only') }}
              </label>
              <Button
                type="button"
                :label="__('Find Matching Units')"
                :loading="matchesLoading"
                @click="loadMatches"
              />
            </div>

            <div
              v-if="matchesLoading"
              class="rounded-lg border border-outline-gray-2 p-8 text-center text-sm text-ink-gray-6"
            >
              {{ __('Loading matching properties...') }}
            </div>
            <div
              v-else-if="matches.length"
              class="grid max-h-[380px] gap-3 overflow-auto pr-1 lg:grid-cols-2"
            >
              <button
                v-for="unit in matches"
                :key="unit.name"
                type="button"
                class="rounded-xl border p-4 text-left transition duration-150 active:scale-[0.99]"
                :class="
                  isUnitSelected(unit.name)
                    ? 'border-outline-blue-2 bg-surface-blue-1'
                    : 'border-outline-gray-2 bg-surface-white hover:bg-surface-gray-1'
                "
                @click="toggleUnit(unit.name)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-ink-gray-9">
                      {{ unit.location || __('Location not set') }}
                    </p>
                    <p class="truncate text-sm text-ink-gray-7">
                      {{
                        unit.project_label ||
                        unit.project ||
                        __('Project not set')
                      }}
                    </p>
                  </div>
                  <div class="shrink-0 text-right">
                    <span
                      class="rounded-full bg-surface-blue-2 px-2 py-1 text-xs font-semibold text-ink-blue-3"
                    >
                      {{ unit.match_score }}%
                    </span>
                    <p class="mt-1 font-semibold text-ink-gray-9">
                      {{ formatPrice(unit.price) }}
                    </p>
                  </div>
                </div>
                <div
                  class="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-surface-gray-1 p-3 text-xs text-ink-gray-7"
                >
                  <span>{{ __('Type') }}: {{ unit.unit_type || '—' }}</span>
                  <span
                    >{{ __('Developer') }}: {{ unit.developer || '—' }}</span
                  >
                  <span
                    >{{ __('Finishing') }}:
                    {{ unit.finishing_type || '—' }}</span
                  >
                  <span>{{ __('Floor') }}: {{ unit.floor ?? '—' }}</span>
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  <span
                    v-for="reason in unit.match_reasons || []"
                    :key="reason"
                    class="rounded-full bg-surface-green-1 px-2 py-1 text-xs text-ink-green-3"
                  >
                    {{ reason }}
                  </span>
                  <span
                    v-for="gap in unit.match_gaps || []"
                    :key="gap"
                    class="rounded-full bg-surface-amber-1 px-2 py-1 text-xs text-ink-amber-3"
                  >
                    {{ gap }}
                  </span>
                </div>
              </button>
            </div>
            <div
              v-else
              class="rounded-lg border border-dashed border-outline-gray-2 p-6 text-center text-sm text-ink-gray-6"
            >
              {{
                __(
                  'Enter requirements and find matching units, or choose Requested Unit below.',
                )
              }}
            </div>

            <label
              class="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-outline-amber-2 bg-surface-amber-1 p-3"
            >
              <input
                v-model="draft.requestedUnit"
                type="checkbox"
                class="mt-1"
                @change="onRequestedUnitChange"
              />
              <span>
                <span class="block text-sm font-medium text-ink-amber-3">
                  {{ __('Requested Unit — No Suitable Match') }}
                </span>
                <span class="text-xs text-ink-gray-6">
                  {{
                    __(
                      'Save the requirements as demand without linking an inventory unit.',
                    )
                  }}
                </span>
              </span>
            </label>
            <p class="mt-2 text-sm text-ink-gray-6">
              {{ draft.selectedUnits.length }} {{ __('unit(s) selected') }}
            </p>
          </section>

          <section v-if="showNextAction" class="action-section">
            <SectionTitle
              :number="nextActionSectionNumber"
              :title="__('Next Action')"
              :description="
                __(
                  'Choose the legal continuation using the unsaved outcome and interests above.',
                )
              "
            />
            <div class="grid gap-3 md:grid-cols-2">
              <SelectField
                v-model="draft.nextActionKey"
                :label="__('Next Action')"
                :options="nextActionOptions.map((item) => item.key)"
                :option-labels="nextActionLabels"
                required
              />
              <SelectField
                v-model="draft.nextTiming"
                :label="__('Next Action Timing')"
                :options="['Do Now', 'Schedule for Later']"
                required
              />
              <label
                v-if="draft.nextTiming === 'Schedule for Later'"
                class="field-label"
              >
                {{ __('Next Action Date & Time') }} *
                <input
                  v-model="draft.nextScheduledStart"
                  type="datetime-local"
                  class="field-input"
                  required
                />
              </label>
            </div>
          </section>

          <section v-if="showResultSections" class="action-section">
            <SectionTitle
              :number="notesSectionNumber"
              :title="__('Optional Notes')"
              :description="
                __(
                  'Free-text comments are optional; structured outcomes above drive the workflow.',
                )
              "
            />
            <textarea
              v-model="draft.notes"
              rows="3"
              class="field-input h-auto py-2"
              :placeholder="
                isSendOffer
                  ? __('Optional WhatsApp introduction')
                  : __('Optional action notes')
              "
            />
          </section>
        </div>

        <div class="mt-4 flex items-center justify-between gap-3 border-t pt-4">
          <p class="text-xs text-ink-gray-5">
            {{ __('Nothing is saved until Submit Action succeeds.') }}
          </p>
          <div class="flex gap-2">
            <Button
              type="button"
              :label="__('Cancel')"
              variant="subtle"
              @click="close"
            />
            <Button
              type="submit"
              :label="submitLabel"
              variant="solid"
              :loading="submitting"
            />
          </div>
        </div>
      </form>
    </template>
  </Dialog>
</template>

<script setup>
import LinkControl from '@/components/Controls/Link.vue'
import { Button, Dialog, call, toast } from 'frappe-ui'
import { computed, defineComponent, h, reactive, ref, watch } from 'vue'

const SectionTitle = defineComponent({
  props: {
    number: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
  },
  setup(props) {
    return () =>
      h('div', { class: 'mb-3 flex items-start gap-3' }, [
        h(
          'span',
          {
            class:
              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-blue-2 text-xs font-semibold text-ink-blue-3',
          },
          String(props.number),
        ),
        h('div', null, [
          h('p', { class: 'font-medium text-ink-gray-9' }, props.title),
          props.description
            ? h('p', { class: 'text-xs text-ink-gray-5' }, props.description)
            : null,
        ]),
      ])
  },
})

const SelectField = defineComponent({
  props: {
    modelValue: { type: [String, Number], default: '' },
    label: { type: String, required: true },
    options: { type: Array, default: () => [] },
    optionLabels: { type: Object, default: () => ({}) },
    required: { type: Boolean, default: false },
    allowCustom: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h('label', { class: 'field-label' }, [
        `${props.label}${props.required ? ' *' : ''}`,
        h(
          'select',
          {
            value: props.modelValue,
            required: props.required,
            class: 'field-input',
            onChange: (event) => emit('update:modelValue', event.target.value),
          },
          [
            h(
              'option',
              { value: '' },
              props.allowCustom
                ? __('Select or use saved value')
                : __('Select'),
            ),
            ...props.options
              .filter(Boolean)
              .map((option) =>
                h(
                  'option',
                  { value: option },
                  props.optionLabels[option] || __(option),
                ),
              ),
          ],
        ),
      ])
  },
})

const InterestRowChecks = defineComponent({
  props: {
    modelValue: { type: Array, default: () => [] },
    rows: { type: Array, default: () => [] },
    label: { type: String, required: true },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const toggle = (name) => {
      const values = new Set(props.modelValue)
      if (values.has(name)) values.delete(name)
      else values.add(name)
      emit('update:modelValue', [...values])
    }
    return () =>
      h('div', { class: 'space-y-2' }, [
        h('p', { class: 'text-sm font-medium text-ink-gray-8' }, props.label),
        ...props.rows.map((row) =>
          h(
            'label',
            {
              class:
                'flex cursor-pointer items-center gap-2 rounded border border-outline-gray-2 p-2 text-sm',
            },
            [
              h('input', {
                type: 'checkbox',
                checked: props.modelValue.includes(row.name),
                onChange: () => toggle(row.name),
              }),
              h('span', null, row.label),
            ],
          ),
        ),
      ])
  },
})

const props = defineProps({
  leadId: { type: String, required: true },
  action: { type: Object, default: null },
  context: { type: Object, default: () => ({}) },
  lead: { type: Object, default: () => ({}) },
  forceImmediate: { type: Boolean, default: false },
  initialCancel: { type: Boolean, default: false },
})
const emit = defineEmits(['submitted', 'start-call', 'cancelled'])
const show = defineModel({ type: Boolean, default: false })

const submitting = ref(false)
const matchesLoading = ref(false)
const matches = ref([])
const callStarted = ref(false)
const filterOptions = reactive({
  locations: [],
  unitTypes: [
    'Apartment',
    'Duplex',
    'Townhouse',
    'Villa',
    'Chalet',
    'Studio',
    'Penthouse',
  ],
  finishingTypes: [
    'Core & Shell',
    'Semi-Finished',
    'Fully Finished',
    'Ultra Super Lux',
  ],
})
const draft = reactive({})

const actionType = computed(() => props.action?.action_type || '')
const actionPurpose = computed(() => props.action?.purpose || '')
const isNewAction = computed(() => !props.action?.name)
const isCall = computed(() => actionType.value === 'Call')
const isInitialQualification = computed(
  () => isCall.value && actionPurpose.value === 'Initial Qualification',
)
const isOfferFollowUp = computed(
  () => isCall.value && actionPurpose.value === 'Offer Follow-up',
)
const isGeneralCall = computed(
  () => isCall.value && !isInitialQualification.value && !isOfferFollowUp.value,
)
const isMeeting = computed(() => actionType.value === 'Meeting')
const isOwnerMeeting = computed(
  () => isMeeting.value && actionPurpose.value === 'Meeting with Owner',
)
const isExploreMeeting = computed(
  () => isMeeting.value && actionPurpose.value === 'Explore Meeting',
)
const isShowing = computed(() => actionType.value === 'Showing')
const isSendOffer = computed(() => actionType.value === 'Send Offer')
const isOfferDecision = computed(() => actionType.value === 'Offer Decision')
const isNegotiation = computed(
  () => actionType.value === 'Negotiation Follow-up',
)
const canSchedule = computed(
  () =>
    !props.forceImmediate &&
    !['Add Interest', 'Offer Decision'].includes(actionType.value),
)
const scheduleOnly = computed(
  () =>
    isNewAction.value &&
    canSchedule.value &&
    draft.executionTiming === 'Schedule for Later',
)
const showResultSections = computed(
  () =>
    !scheduleOnly.value &&
    actionType.value !== 'Add Interest' &&
    !draft.cancelAction,
)
const showInterestBlock = computed(
  () =>
    !draft.cancelAction &&
    (actionType.value === 'Add Interest' ||
      (isInitialQualification.value &&
        draft.contactResult === 'Answered' &&
        draft.qualification === 'Interested') ||
      (isExploreMeeting.value &&
        draft.outcome === 'Done' &&
        draft.updateInterest) ||
      (isOfferDecision.value && draft.offerDecision === 'Change Requirements')),
)
const isInventoryInterest = computed(() =>
  ['Resale', 'Primary'].includes(draft.interestCategory),
)
const showSmartMatch = computed(
  () => showInterestBlock.value && isInventoryInterest.value,
)
const shouldRequireNextAction = computed(() => {
  if (scheduleOnly.value) return false
  if (draft.cancelAction) return true
  if (actionType.value === 'Add Interest') return true
  if (!showResultSections.value) return false
  if (draft.outcome === 'Rescheduled') return false
  if (isInitialQualification.value) {
    if (draft.contactResult !== 'Answered') return Boolean(draft.contactResult)
    return draft.qualification === 'Interested'
  }
  return (
    props.context?.qualification === 'Interested' || showInterestBlock.value
  )
})
const showNextAction = computed(() => shouldRequireNextAction.value)
const scopedRows = computed(() => {
  const names = new Set(
    props.action?.interest_row_names || props.action?.interest_rows || [],
  )
  const rows = props.context?.interest_rows || []
  return names.size ? rows.filter((row) => names.has(row.name)) : rows
})
const ownerRows = computed(() =>
  (props.context?.interest_rows || []).filter(
    (row) => row.interest_category === 'Resale' && row.unit,
  ),
)
const ownerInterestOptions = computed(() =>
  ownerRows.value.map((row) => row.name),
)
const offerRowOptions = computed(() => scopedRows.value.map((row) => row.name))
const rowLabels = computed(() =>
  Object.fromEntries(
    (props.context?.interest_rows || []).map((row) => [row.name, row.label]),
  ),
)
const nextActionOptions = computed(() => buildNextActionOptions())
const nextActionLabels = computed(() =>
  Object.fromEntries(
    nextActionOptions.value.map((item) => [item.key, item.label]),
  ),
)

const dialogTitle = computed(
  () => props.action?.label || `${actionType.value} — ${actionPurpose.value}`,
)
const submitLabel = computed(() =>
  scheduleOnly.value ? __('Schedule Action') : __('Submit Action'),
)
const resultSectionNumber = computed(() => (isNewAction.value ? 2 : 1))
const interestSectionNumber = computed(() => resultSectionNumber.value + 1)
const smartMatchSectionNumber = computed(() => interestSectionNumber.value + 1)
const nextActionSectionNumber = computed(
  () =>
    (showSmartMatch.value
      ? smartMatchSectionNumber.value
      : interestSectionNumber.value) + 1,
)
const notesSectionNumber = computed(
  () => nextActionSectionNumber.value + (showNextAction.value ? 1 : 0),
)
const resultSectionTitle = computed(() => {
  if (isCall.value) return __('Call Result')
  if (isMeeting.value) return __(actionPurpose.value)
  if (isOfferDecision.value) return __('Offer Sent Decision')
  if (isShowing.value) return __('Showing Result')
  if (isSendOffer.value) return __('WhatsApp Offer')
  return __('Action Result')
})
const resultSectionDescription = computed(() => {
  if (isInitialQualification.value)
    return __('Answered calls reveal qualification and interest in sequence.')
  if (isOfferDecision.value)
    return __('Select one offer or restart with new requirements.')
  return __('Only fields relevant to this result are required.')
})

function resetDraft() {
  Object.assign(draft, {
    executionTiming: 'Do Now',
    scheduledStart: '',
    cancelAction: props.initialCancel,
    contactResult: '',
    qualification: '',
    outcome: '',
    unitOutcome: '',
    rescheduleTo: '',
    offerDecision: '',
    selectedOffer: '',
    selectedInterestRows: [
      ...(props.action?.interest_rows ||
        props.action?.interest_row_names ||
        []),
    ],
    ownerInterestRow: '',
    showingInterestRow:
      (props.action?.interest_rows ||
        props.action?.interest_row_names ||
        [])[0] || '',
    interestCategory: '',
    preferredArea: props.lead?.preferred_area || '',
    preferredUnitType: props.lead?.preferred_unit_type || '',
    buyerBudget: props.lead?.buyer_budget || '',
    preferredProject: props.lead?.preferred_compound || '',
    preferredDeveloper: props.lead?.preferred_developer || '',
    preferredFinishing: props.lead?.preferred_finishing_type || '',
    preferredDelivery: props.lead?.preferred_delivery_time || '',
    requestNotes: '',
    internationalType: '',
    internationalCountry: '',
    internationalDetails: '',
    selectedUnits: [],
    requestedUnit: false,
    strictFilters: false,
    matchSearch: '',
    updateInterest: false,
    nextActionKey: '',
    nextTiming: 'Do Now',
    nextScheduledStart: '',
    notes: '',
  })
  matches.value = []
  callStarted.value = false
}

function mergeCurrentOption(options, value) {
  return value && !options.includes(value) ? [value, ...options] : options
}

async function loadFilterOptions() {
  if (!draft.interestCategory) return
  try {
    const result = await call(
      'real_estate_crm_customs.api.get_property_match_filter_options',
      { interest_category: draft.interestCategory },
    )
    filterOptions.locations = mergeCurrentOption(
      result?.locations || [],
      draft.preferredArea,
    )
    if (result?.unit_types?.length)
      filterOptions.unitTypes = mergeCurrentOption(
        result.unit_types,
        draft.preferredUnitType,
      )
    if (result?.finishing_types?.length)
      filterOptions.finishingTypes = mergeCurrentOption(
        result.finishing_types,
        draft.preferredFinishing,
      )
  } catch {
    // Schema defaults remain available when inventory options cannot load.
  }
}

async function loadMatches() {
  if (!validateInterestRequirements({ requireResolution: false })) return
  matchesLoading.value = true
  try {
    const result = await call(
      'real_estate_crm_customs.api.get_smart_matched_units',
      {
        lead: props.leadId,
        interest_category: draft.interestCategory,
        search: draft.matchSearch || null,
        location: draft.preferredArea || null,
        project: draft.preferredProject || null,
        developer: draft.preferredDeveloper || null,
        unit_type: draft.preferredUnitType || null,
        finishing_type: draft.preferredFinishing || null,
        max_price: draft.buyerBudget || null,
        strict_filters: draft.strictFilters ? 1 : 0,
      },
    )
    matches.value = result?.units || []
  } catch (error) {
    toast.error(
      error.messages?.[0] ||
        error.message ||
        __('Could not load matching properties.'),
    )
  } finally {
    matchesLoading.value = false
  }
}

function validateInterestRequirements({ requireResolution = true } = {}) {
  if (!draft.interestCategory) {
    toast.error(__('Select an interest category.'))
    return false
  }
  if (isInventoryInterest.value) {
    if (
      !draft.preferredArea ||
      !draft.preferredUnitType ||
      !draft.buyerBudget
    ) {
      toast.error(__('Location, unit type, and maximum budget are required.'))
      return false
    }
  }
  if (draft.interestCategory === 'Brokerage Request' && !draft.requestNotes) {
    toast.error(__('Brokerage requirements are mandatory.'))
    return false
  }
  if (
    draft.interestCategory === 'International' &&
    (!draft.internationalType || !draft.internationalCountry)
  ) {
    toast.error(__('International category and country are mandatory.'))
    return false
  }
  if (
    requireResolution &&
    isInventoryInterest.value &&
    !draft.requestedUnit &&
    !draft.selectedUnits.length
  ) {
    toast.error(__('Select matching units or choose Requested Unit.'))
    return false
  }
  return true
}

function isUnitSelected(name) {
  return draft.selectedUnits.includes(name)
}

function toggleUnit(name) {
  draft.requestedUnit = false
  const selected = new Set(draft.selectedUnits)
  if (selected.has(name)) selected.delete(name)
  else selected.add(name)
  draft.selectedUnits = [...selected]
}

function onRequestedUnitChange() {
  if (draft.requestedUnit) draft.selectedUnits = []
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—'
  return Number(value).toLocaleString()
}

function startCall() {
  callStarted.value = true
  emit('start-call', props.action)
}

function actionKey(item) {
  return `${item.action_type}::${item.purpose}`
}

function normalizedPolicyOptions() {
  return (props.context?.allowed_next_actions || [])
    .filter((item) => item?.action_type)
    .map((item) => ({
      ...item,
      key: actionKey(item),
      label: item.label || actionKey(item),
    }))
}

function interestDrivenOptions() {
  const options = [
    {
      action_type: 'Call',
      purpose: 'General Follow-up',
      label: __('Follow up by call'),
    },
    {
      action_type: 'Meeting',
      purpose: 'General Meeting',
      label: __('General meeting'),
    },
    {
      action_type: 'Meeting',
      purpose: 'Explore Meeting',
      label: __('Explore requirements meeting'),
    },
  ]
  if (draft.selectedUnits.length) {
    options.push({
      action_type: 'Send Offer',
      purpose: 'Offer Follow-up',
      label: __('Send selected unit offers by WhatsApp'),
      units: [...draft.selectedUnits],
    })
  }
  if (draft.interestCategory === 'Resale' && draft.selectedUnits.length === 1) {
    options.push({
      action_type: 'Meeting',
      purpose: 'Meeting with Owner',
      label: __('Meet the Resale unit owner'),
      units: [...draft.selectedUnits],
      unit: draft.selectedUnits[0],
    })
  }
  return options.map((item) => ({ ...item, key: actionKey(item) }))
}

function offerDecisionOptions() {
  if (draft.offerDecision === 'Select an Offer' && draft.selectedOffer) {
    const selectedRow = (props.context?.interest_rows || []).find(
      (row) => row.name === draft.selectedOffer,
    )
    const units = selectedRow?.unit ? [selectedRow.unit] : []
    return [
      {
        action_type: 'Negotiation Follow-up',
        purpose: 'Negotiation Follow-up',
        label: __('Continue negotiation'),
        interest_rows: [draft.selectedOffer],
      },
      {
        action_type: 'Showing',
        purpose: 'Showing Confirmation',
        label: __('Schedule or hold a showing'),
        interest_rows: [draft.selectedOffer],
        unit: selectedRow?.unit,
      },
      ...(selectedRow?.interest_category === 'Resale'
        ? [
            {
              action_type: 'Meeting',
              purpose: 'Meeting with Owner',
              label: __('Meet the Resale unit owner'),
              interest_rows: [draft.selectedOffer],
              unit: selectedRow?.unit,
              units,
            },
          ]
        : []),
    ].map((item) => ({ ...item, key: actionKey(item) }))
  }
  if (draft.offerDecision === 'Change Requirements')
    return interestDrivenOptions()
  return []
}

function buildNextActionOptions() {
  let options = normalizedPolicyOptions()
  if (showInterestBlock.value) options = interestDrivenOptions()
  if (isOfferDecision.value) options = offerDecisionOptions()
  if (isSendOffer.value) {
    options = [
      {
        action_type: 'Offer Decision',
        purpose: 'Offer Decision',
        label: __('Select an offer or change requirements'),
        interest_rows: [...draft.selectedInterestRows],
        key: 'Offer Decision::Offer Decision',
      },
    ]
  }
  const seen = new Set()
  return options.filter((item) => {
    if (!item?.action_type || seen.has(item.key)) return false
    seen.add(item.key)
    return true
  })
}

function selectedNextDefinition() {
  return nextActionOptions.value.find(
    (item) => item.key === draft.nextActionKey,
  )
}

function buildNextAction() {
  if (!showNextAction.value) return null
  const definition = selectedNextDefinition()
  if (!definition) throw new Error(__('Select the next action.'))
  if (draft.nextTiming === 'Schedule for Later' && !draft.nextScheduledStart)
    throw new Error(__('Select the next action date and time.'))
  return {
    action_type: definition.action_type,
    purpose: definition.purpose,
    execute_now: draft.nextTiming === 'Do Now' ? 1 : 0,
    scheduled_start:
      draft.nextTiming === 'Do Now'
        ? frappeNowDateTime()
        : draft.nextScheduledStart,
    interest_rows: definition.interest_rows || [],
    units: definition.units || [],
    unit: definition.unit || null,
  }
}

function buildInterestPayload() {
  if (!showInterestBlock.value) return null
  if (!validateInterestRequirements()) return false
  return {
    interest_category: draft.interestCategory,
    units: [...draft.selectedUnits],
    requested_unit: draft.requestedUnit ? 1 : 0,
    request_notes: draft.requestNotes || null,
    international_type: draft.internationalType || null,
    international_country: draft.internationalCountry || null,
    international_details: draft.internationalDetails || null,
    preferred_area: draft.preferredArea || null,
    preferred_unit_type: draft.preferredUnitType || null,
    buyer_budget: draft.buyerBudget || null,
    preferred_compound: draft.preferredProject || null,
    preferred_developer: draft.preferredDeveloper || null,
    preferred_finishing_type: draft.preferredFinishing || null,
    preferred_delivery_time: draft.preferredDelivery || null,
  }
}

function validateResult() {
  if (scheduleOnly.value || draft.cancelAction) return true
  if (isCall.value) {
    if (!draft.contactResult) throw new Error(__('Select the contact result.'))
    if (
      draft.contactResult === 'Answered' &&
      isInitialQualification.value &&
      !draft.qualification
    )
      throw new Error(__('Select Interested or Not Interested.'))
    if (
      draft.contactResult === 'Answered' &&
      isOfferFollowUp.value &&
      !draft.outcome
    )
      throw new Error(__('Select the offer follow-up outcome.'))
    if (
      draft.contactResult === 'Answered' &&
      isGeneralCall.value &&
      !draft.outcome
    )
      throw new Error(__('Select the call outcome.'))
  }
  if (isMeeting.value && !draft.outcome)
    throw new Error(__('Select the meeting outcome.'))
  if (isShowing.value && !draft.outcome)
    throw new Error(__('Select the showing outcome.'))
  if (isShowing.value && draft.outcome === 'Completed' && !draft.unitOutcome)
    throw new Error(__('Select the unit outcome.'))
  if (isOfferDecision.value && !draft.offerDecision)
    throw new Error(__('Select the Lead decision.'))
  if (
    isOfferDecision.value &&
    draft.offerDecision === 'Select an Offer' &&
    !draft.selectedOffer
  )
    throw new Error(__('Select one offered unit.'))
  if (
    (isSendOffer.value || isNegotiation.value) &&
    !draft.selectedInterestRows.length
  )
    throw new Error(__('Select at least one interest record.'))
  return true
}

function buildResultPayload() {
  if (scheduleOnly.value) return {}
  if (draft.cancelAction) {
    const cancelled = {
      outcome: 'Cancelled',
      closed_reason: draft.notes || null,
      result_note: draft.notes || null,
    }
    const nextAction = buildNextAction()
    if (nextAction) cancelled.next_action = nextAction
    return cancelled
  }
  const result = {
    contact_result: draft.contactResult || null,
    qualification: draft.qualification || null,
    outcome: draft.outcome || null,
    unit_outcome: draft.unitOutcome || null,
    reschedule_to: draft.rescheduleTo || null,
    result_note: draft.notes || null,
    decision: draft.offerDecision || null,
    selected_offer: draft.selectedOffer || null,
    interest_rows: [...draft.selectedInterestRows],
  }
  if (isSendOffer.value) result.outcome = 'Dispatched'
  if (isShowing.value && draft.showingInterestRow)
    result.interest_rows = [draft.showingInterestRow]
  const nextAction = buildNextAction()
  if (nextAction) result.next_action = nextAction
  return result
}

function buildActionPayload() {
  if (props.action?.name) return { name: props.action.name }
  const definition = props.action || {}
  const ownerRow = ownerRows.value.find(
    (row) => row.name === draft.ownerInterestRow,
  )
  const showingRow = scopedRows.value.find(
    (row) => row.name === draft.showingInterestRow,
  )
  const interestRows = isOwnerMeeting.value
    ? draft.ownerInterestRow
      ? [draft.ownerInterestRow]
      : []
    : isShowing.value
      ? draft.showingInterestRow
        ? [draft.showingInterestRow]
        : []
      : definition.interest_row_names || definition.interest_rows || []
  return {
    action_type: definition.action_type,
    purpose: definition.purpose,
    execute_now: scheduleOnly.value ? 0 : 1,
    scheduled_start: scheduleOnly.value
      ? draft.scheduledStart
      : frappeNowDateTime(),
    interest_rows: interestRows,
    unit: ownerRow?.unit || showingRow?.unit || definition.unit || null,
    notes: draft.notes || null,
  }
}

async function submitBundle() {
  const dispatchWindow = isSendOffer.value
    ? window.open('about:blank', '_blank')
    : null
  try {
    if (isNewAction.value && scheduleOnly.value && !draft.scheduledStart)
      throw new Error(__('Select the scheduled date and time.'))
    validateResult()
    const interest = buildInterestPayload()
    if (interest === false) return
    const payload = {
      action_name: props.action?.name || null,
      action: buildActionPayload(),
      result: buildResultPayload(),
      interest,
      client_request_id: createClientRequestId(),
    }
    submitting.value = true
    const result = await call(
      'real_estate_crm_customs.api.submit_lead_action_bundle',
      {
        lead: props.leadId,
        bundle: JSON.stringify(payload),
        client_request_id: payload.client_request_id,
      },
    )
    if (result?.dispatch?.whatsapp_url) {
      if (dispatchWindow)
        dispatchWindow.location.href = result.dispatch.whatsapp_url
      else window.location.assign(result.dispatch.whatsapp_url)
    } else {
      dispatchWindow?.close()
    }
    emit('submitted', result, payload)
    show.value = false
  } catch (error) {
    dispatchWindow?.close()
    toast.error(
      error.messages?.[0] ||
        error.message ||
        __('Could not submit the action.'),
    )
  } finally {
    submitting.value = false
  }
}

function frappeNowDateTime() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function createClientRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `lead-action-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function close() {
  show.value = false
  emit('cancelled')
}

watch(
  () => draft.interestCategory,
  async (category) => {
    matches.value = []
    draft.selectedUnits = []
    draft.requestedUnit = false
    if (category) await loadFilterOptions()
  },
)

let matchRefreshTimer = null
watch(
  () => [
    draft.interestCategory,
    draft.preferredArea,
    draft.preferredUnitType,
    draft.buyerBudget,
    draft.preferredProject,
    draft.preferredDeveloper,
    draft.preferredFinishing,
    draft.strictFilters,
  ],
  () => {
    clearTimeout(matchRefreshTimer)
    if (
      !showSmartMatch.value ||
      !draft.preferredArea ||
      !draft.preferredUnitType ||
      !draft.buyerBudget
    )
      return
    matchRefreshTimer = setTimeout(loadMatches, 450)
  },
)

watch(show, (value) => {
  if (value) resetDraft()
})
</script>

<style scoped>
.action-section {
  @apply rounded-xl border border-outline-gray-2 bg-surface-white p-4;
}
.field-label {
  @apply flex flex-col gap-1 text-xs font-medium text-ink-gray-6;
}
.field-input {
  @apply h-9 w-full rounded border border-outline-gray-2 bg-surface-white px-3 text-sm text-ink-gray-8 focus:border-outline-gray-4 focus:outline-none;
}
</style>
