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
            v-if="isCounterpartyMeeting && !draft.cancelAction"
            class="action-section"
          >
            <SectionTitle
              :number="isNewAction ? 2 : 1"
              :title="counterpartyMeetingTitle"
              :description="
                __(counterpartyMeetingDescription)
              "
            />
            <SelectField
              v-model="draft.counterpartyInterestRow"
              :label="counterpartyMeetingSelectionLabel"
              :options="counterpartyInterestOptions"
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
                  'Owner/Unit Unavailable',
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

            <div v-else-if="isClosing" class="grid gap-3 md:grid-cols-2">
              <SelectField
                v-model="draft.outcome"
                :label="__('Contract Signing Outcome')"
                :options="[
                  'Pending Signing',
                  'Contract Signed',
                  'Return to Negotiation',
                  'Buyer Withdrew',
                ]"
                required
              />
              <template v-if="draft.outcome === 'Contract Signed'">
                <label class="field-label">
                  {{ __('Contract Reference') }} *
                  <input
                    v-model.trim="draft.contractReference"
                    type="text"
                    class="field-input"
                    required
                  />
                </label>
                <label class="field-label">
                  {{ __('Contract Signed Date') }} *
                  <input
                    v-model="draft.contractSignedDate"
                    type="date"
                    :max="todayIso"
                    class="field-input"
                    required
                  />
                </label>
                <label class="field-label">
                  {{ __('Signed Contract Attachment') }}
                  <FileUploader
                    :upload-args="{ private: true, doctype: 'CRM Lead', docname: leadId }"
                    @success="(file) => (draft.signedContract = file.file_url)"
                  >
                    <template #default="{ openFileSelector, uploading, error }">
                      <Button
                        type="button"
                        :label="draft.signedContract ? __('Replace private attachment') : __('Upload private contract (optional)')"
                        :loading="uploading"
                        @click="openFileSelector"
                      />
                      <p v-if="error" class="text-xs text-ink-red-3">{{ error }}</p>
                    </template>
                  </FileUploader>
                  <p v-if="draft.signedContract" class="break-all text-xs text-ink-gray-6">{{ draft.signedContract }}</p>
                  <span class="mt-1 block text-xs text-ink-gray-5">
                    {{ __('Recommended, but not required to record a signature.') }}
                  </span>
                </label>
              </template>
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
                :disabled="isMatchRequested"
                :options="[
                  'Resale',
                  'Primary',
                  'Brokerage Request',
                  'International',
                ]"
                required
              />
              <SelectField
                v-if="canRentInterest"
                v-model="draft.dealType"
                :label="__('Deal Type')"
                :options="dealTypes"
                required
              />
              <template v-if="hasPropertyCriteria">
                <LinkControl
                  v-model="draft.preferredDestination"
                  doctype="Real Estate Destination"
                  :label="__('Preferred Destination (required)')"
                  :placeholder="__('Select a destination')"
                />
                <p
                  v-if="draft.legacyPreferredArea && !draft.preferredDestination"
                  class="self-end rounded bg-surface-amber-1 px-3 py-2 text-xs text-ink-amber-3"
                >
                  {{ __('Legacy location') }}: {{ draft.legacyPreferredArea }}.
                  {{ __('Select its canonical Destination before submitting.') }}
                </p>
                <LinkControl
                  v-model="draft.preferredUnitCategory"
                  doctype="Real Estate Unit Category"
                  :label="__('Preferred Unit Category')"
                  :placeholder="__('Select a unit category')"
                />
                <LinkControl
                  v-model="draft.preferredUnitType"
                  doctype="Real Estate Unit Type"
                  :label="__('Preferred Unit Type')"
                  :placeholder="
                    draft.preferredUnitCategory
                      ? __('Unit types in {0}', [draft.preferredUnitCategory])
                      : __('Select a unit type')
                  "
                  :filters="unitTypeLinkFilters"
                />
                <CurrencyBudgetInput
                  v-if="isRentRequest"
                  v-model="draft.rentBudget"
                  :label="__('Maximum Monthly Rent')"
                  :currency="activeBudgetCurrency"
                  :required="isInventoryInterest"
                  :hint="__('Rent per month. Daily rents are compared as 30 days.')"
                />
                <template v-else>
                  <CurrencyBudgetInput
                    v-model="draft.buyerBudget"
                    :label="__('Maximum Total Budget')"
                    :currency="activeBudgetCurrency"
                    :required="isInventoryInterest"
                    :hint="__('Maximum complete purchase budget, not a monthly payment.')"
                  />
                  <CurrencyBudgetInput
                    v-model="draft.downPaymentBudget"
                    :label="__('Maximum Down Payment Budget')"
                    :currency="activeBudgetCurrency"
                    :hint="__('Optional maximum upfront-payment affordability.')"
                  />
                  <CurrencyBudgetInput
                    v-model="draft.monthlyInstallmentBudget"
                    :label="__('Maximum Monthly Installment Budget')"
                    :currency="activeBudgetCurrency"
                    :hint="__('Optional — per month.')"
                  />
                </template>
                <div class="field-label">
                  {{ __('Budget Currency') }}
                  <LinkControl
                    v-model="draft.budgetCurrency"
                    doctype="Currency"
                    :placeholder="filterOptions.currency || __('Configure FCRM currency')"
                  />
                </div>
                <p
                  v-if="!activeBudgetCurrency"
                  class="md:col-span-2 rounded bg-surface-amber-1 px-3 py-2 text-xs text-ink-amber-3"
                >
                  {{ __('Currency is not configured. Set FCRM Settings currency before matching or saving budgets.') }}
                </p>
                <SelectField
                  v-if="isInventoryInterest && !isRentRequest"
                  v-model="draft.inventorySearchScope"
                  :label="__('Inventory Search Scope')"
                  :options="inventorySearchScopes"
                  required
                />
                <p
                  v-else-if="isInventoryInterest"
                  class="self-end rounded bg-surface-gray-1 px-3 py-2 text-xs text-ink-gray-6"
                >
                  {{ __('Rent requests search Owner-listed Resale Units listed for rent.') }}
                </p>
                <LinkControl
                  v-model="draft.preferredProject"
                  doctype="Real Estate Project"
                  :label="__('Preferred Compound')"
                  :placeholder="__('Select a compound')"
                  :filters="compoundLinkFilters"
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
                  {{ __('Preferred Delivery Date') }}
                  <input
                    v-model="draft.preferredDeliveryDate"
                    type="date"
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
            <p
              v-if="draft.selectionNotice"
              class="mb-3 rounded-lg border border-outline-amber-2 bg-surface-amber-1 p-3 text-sm text-ink-amber-3"
            >
              {{ draft.selectionNotice }}
            </p>
            <div v-if="selectedUnitCards.length" class="mb-3 flex flex-wrap gap-2">
              <span
                v-for="unit in selectedUnitCards"
                :key="`selected-${unit.name}`"
                class="rounded-full bg-surface-blue-2 px-2.5 py-1 text-xs font-medium text-ink-blue-3"
              >
                {{ unit.unit_number || unit.sku || unit.name }} ·
                {{ unit.inventory_type || unit.interest_category || __('Unit') }}
              </span>
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
              <div
                v-for="unit in matches"
                :key="unit.name"
                role="button"
                tabindex="0"
                class="rounded-xl border p-4 text-left transition duration-150 active:scale-[0.99]"
                :class="
                  isUnitSelected(unit.name)
                    ? 'border-outline-blue-2 bg-surface-blue-1'
                    : 'border-outline-gray-2 bg-surface-white hover:bg-surface-gray-1'
                "
                @click="toggleUnit(unit.name)"
                @keydown.enter.prevent="toggleUnit(unit.name)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-ink-gray-9">
                      {{
                        unit.destination_label ||
                        unit.destination ||
                        unit.location ||
                        __('Destination not set')
                      }}
                    </p>
                    <p class="truncate text-sm text-ink-gray-7">
                      {{
                        unit.project_label ||
                        unit.project ||
                        __('Compound not set')
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
                      {{
                        formatPrice(
                          unit.effective_price ?? unit.total_gross ?? unit.price,
                          unit.budget_currency || filterOptions.currency,
                        )
                      }}
                    </p>
                  </div>
                </div>
                <div
                  class="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-surface-gray-1 p-3 text-xs text-ink-gray-7"
                >
                  <span
                    >{{ __('Type') }}:
                    {{ unit.physical_unit_type || unit.unit_type || '—' }}</span
                  >
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
                  <span
                    v-for="comparison in unitComparisons(unit)"
                    :key="comparison.key"
                    class="rounded-full px-2 py-1 text-xs"
                    :class="comparison.className"
                  >
                    {{ comparison.label }}: {{ comparison.value }}
                  </span>
                </div>
                <Button
                  class="mt-3"
                  :label="__('Open Unit')"
                  variant="ghosted"
                  @click.stop="openUnit(unit)"
                />
              </div>
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
              v-if="!isMatchRequested"
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
            {{ __('Workflow changes are saved only when Submit Action succeeds. Optional uploads are private Lead attachments.') }}
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
import CurrencyBudgetInput from '@/components/Controls/CurrencyBudgetInput.vue'
import LinkControl from '@/components/Controls/Link.vue'
import {
  CANONICAL_MEETING_PURPOSES,
  DEAL_RENT,
  DEAL_TYPES,
  INVENTORY_SEARCH_SCOPES,
  buildInterestCriteriaPayload,
  canBeginClosing,
  canRentCategory,
  closingNeedsSuccessor,
  closingProjectedStatus,
  compoundFilters,
  compoundIsCompatible,
  counterpartyMeetingPurpose,
  formatCurrencyAmount,
  hasValue,
  isIsoCalendarDate,
  isIsoDateOnOrBeforeToday,
  isPropertyRequirement,
  isRentDeal,
  isTerminalInterestStatus,
  isValidCurrencyAmount,
  normalizeDealType,
  requestSnapshot,
  scopeForCategory,
  selectedUnitIsCompatible,
} from '@/utils/interestWorkflow'
import { isBuyerLead } from '@/utils/leadRole'
import { Button, Dialog, FileUploader, call, toast } from 'frappe-ui'
import { computed, defineComponent, h, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

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
    disabled: { type: Boolean, default: false },
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
            disabled: props.disabled,
            class:
              'field-input disabled:cursor-not-allowed disabled:bg-surface-gray-1',
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
  currency: '',
  unitTypeCategories: {},
})
const availableCompounds = ref([])
const selectedUnitRecords = ref(new Map())
const bundleRequestId = ref('')
let compoundRequest = 0
let matchRequest = 0
const draft = reactive({})
const router = useRouter()
const inventorySearchScopes = INVENTORY_SEARCH_SCOPES
const dealTypes = DEAL_TYPES
const todayIso = frappeNowDateTime().slice(0, 10)
const activeBudgetCurrency = computed(() => draft.budgetCurrency || filterOptions.currency || '')

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
const isMatchRequested = computed(
  () =>
    actionType.value === 'Add Interest' &&
    actionPurpose.value === 'Match Requested Unit',
)
const isGeneralCall = computed(
  () => isCall.value && !isInitialQualification.value && !isOfferFollowUp.value,
)
const isMeeting = computed(() => actionType.value === 'Meeting')
const isOwnerMeeting = computed(
  () => isMeeting.value && actionPurpose.value === 'Owner Meeting',
)
const isDeveloperMeeting = computed(
  () => isMeeting.value && actionPurpose.value === 'Developer Meeting',
)
const isCounterpartyMeeting = computed(
  () => isOwnerMeeting.value || isDeveloperMeeting.value,
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
const isClosing = computed(
  () => actionType.value === 'Closing' && actionPurpose.value === 'Contract Signing',
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
const hasPropertyCriteria = computed(() =>
  isPropertyRequirement(draft.interestCategory, draft.internationalType),
)
const canRentInterest = computed(() => canRentCategory(draft.interestCategory))
const isRentRequest = computed(() => isRentDeal(draft))
// The comparable budget for matching: monthly rent when renting, total price when buying.
const matchBudget = computed(() =>
  isRentRequest.value ? draft.rentBudget : draft.buyerBudget,
)
const unitTypeLinkFilters = computed(() =>
  draft.preferredUnitCategory
    ? { unit_category: draft.preferredUnitCategory }
    : {},
)
const showSmartMatch = computed(
  () => showInterestBlock.value && isInventoryInterest.value,
)
const shouldRequireNextAction = computed(() => {
  if (scheduleOnly.value || isSendOffer.value) return false
  if (draft.cancelAction) return true
  if (actionType.value === 'Add Interest') return true
  if (!showResultSections.value) return false
  if (draft.outcome === 'Rescheduled') return false
  if (isClosing.value) return closingNeedsSuccessor(draft.outcome)
  if (isInitialQualification.value) {
    if (draft.contactResult !== 'Answered') return Boolean(draft.contactResult)
    return draft.qualification === 'Interested'
  }
  if (isOfferDecision.value && draft.offerDecision === 'Change Requirements')
    return true
  if (scopedInterest.value)
    return !isTerminalInterestStatus(projectedInterestStatus())
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
const counterpartyRows = computed(() =>
  scopedRows.value.filter((row) => {
    const status = row.workflow_status || scopedInterest.value?.workflow_status || ''
    return counterpartyMeetingPurpose(row, status) === actionPurpose.value
  }),
)
const counterpartyInterestOptions = computed(() =>
  counterpartyRows.value.map((row) => row.name),
)
const offerRowOptions = computed(() => scopedRows.value.map((row) => row.name))
const scopedInterest = computed(() =>
  scopedRows.value.length === 1 ? scopedRows.value[0] : null,
)
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
const compoundLinkFilters = computed(() =>
  compoundFilters(draft.preferredDestination, draft.preferredDeveloper),
)
const selectedUnitCards = computed(() =>
  draft.selectedUnits.map((name) => selectedUnitRecords.value.get(name)).filter(Boolean),
)
const counterpartyMeetingTitle = computed(() =>
  isDeveloperMeeting.value ? __('Primary Developer Context') : __('Resale Owner Context'),
)
const counterpartyMeetingDescription = computed(() =>
  isDeveloperMeeting.value
    ? __('Developer Meeting is limited to one active Primary unit with its actual developer and no owner.')
    : __('Owner Meeting is limited to one active owner-listed Resale unit.'),
)
const counterpartyMeetingSelectionLabel = computed(() =>
  isDeveloperMeeting.value ? __('Primary Unit / Developer') : __('Resale Unit / Owner'),
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
  bundleRequestId.value = createClientRequestId()
  compoundRequest += 1
  matchRequest += 1
  selectedUnitRecords.value = new Map()
  const snapshot = requestSnapshot(scopedInterest.value || {}, props.lead || {})
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
    selectedOffer:
      actionType.value === 'Offer Decision'
        ? (props.action?.interest_rows ||
            props.action?.interest_row_names ||
            [])[0] || ''
        : '',
    selectedInterestRows: [
      ...(props.action?.interest_rows ||
        props.action?.interest_row_names ||
        []),
    ],
    counterpartyInterestRow: isCounterpartyMeeting.value
      ? (props.action?.interest_rows ||
          props.action?.interest_row_names ||
          [])[0] || ''
      : '',
    showingInterestRow:
      (props.action?.interest_rows ||
        props.action?.interest_row_names ||
        [])[0] || '',
    interestCategory: isMatchRequested.value
      ? scopedInterest.value?.interest_category || ''
      : '',
    preferredDestination: snapshot.preferredDestination,
    legacyPreferredArea:
      scopedInterest.value?.requested_area || props.lead?.preferred_area || '',
    dealType: snapshot.dealType,
    preferredUnitCategory: snapshot.preferredUnitCategory,
    preferredUnitType: snapshot.preferredUnitType,
    rentBudget: snapshot.rentBudget,
    buyerBudget: snapshot.buyerBudget,
    downPaymentBudget: snapshot.downPaymentBudget,
    monthlyInstallmentBudget: snapshot.monthlyInstallmentBudget,
    budgetCurrency: snapshot.budgetCurrency,
    inventorySearchScope: scopeForCategory(
      isMatchRequested.value ? scopedInterest.value?.interest_category : '',
      snapshot.inventorySearchScope,
      snapshot.dealType,
    ),
    preferredProject: snapshot.preferredProject,
    preferredDeveloper: snapshot.preferredDeveloper,
    preferredFinishing: snapshot.preferredFinishing,
    preferredDeliveryDate: snapshot.preferredDeliveryDate,
    requestNotes: '',
    internationalType: '',
    internationalCountry: '',
    internationalDetails: '',
    selectedUnits: [],
    requestedUnit: false,
    strictFilters: false,
    matchSearch: '',
    updateInterest: false,
    contractReference: '',
    contractSignedDate: '',
    signedContract: '',
    selectionNotice: '',
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
      {
        interest_category: draft.interestCategory,
        inventory_search_scope: draft.inventorySearchScope || null,
        deal_type: normalizeDealType(draft.dealType, draft.interestCategory),
      },
    )
    if (result?.unit_types?.length)
      filterOptions.unitTypes = mergeCurrentOption(
        result.unit_types,
        draft.preferredUnitType,
      )
    filterOptions.unitTypeCategories = result?.unit_type_categories || {}
    if (result?.finishing_types?.length)
      filterOptions.finishingTypes = mergeCurrentOption(
        result.finishing_types,
        draft.preferredFinishing,
      )
    if (result?.currency) {
      filterOptions.currency = result.currency
      if (!draft.budgetCurrency) draft.budgetCurrency = result.currency
    }
  } catch {
    // Schema defaults remain available when inventory options cannot load.
  }
}

async function loadMatches() {
  if (!validateInterestRequirements({ requireResolution: false })) return
  const request = ++matchRequest
  matchesLoading.value = true
  try {
    const result = await call(
      'real_estate_crm_customs.api.get_smart_matched_units',
      {
        lead: props.leadId,
        interest: scopedInterest.value?.name || null,
        interest_category: draft.interestCategory,
        inventory_search_scope: scopeForCategory(
          draft.interestCategory,
          draft.inventorySearchScope,
          draft.dealType,
        ),
        deal_type: normalizeDealType(draft.dealType, draft.interestCategory),
        search: draft.matchSearch || null,
        destination: draft.preferredDestination || '',
        project: draft.preferredProject || '',
        developer: draft.preferredDeveloper || '',
        unit_category: draft.preferredUnitCategory || '',
        physical_unit_type: draft.preferredUnitType || null,
        finishing_type: draft.preferredFinishing || null,
        max_price:
          !isRentRequest.value && hasValue(draft.buyerBudget)
            ? draft.buyerBudget
            : null,
        rent_budget:
          isRentRequest.value && hasValue(draft.rentBudget)
            ? draft.rentBudget
            : '',
        down_payment_budget:
          !isRentRequest.value && hasValue(draft.downPaymentBudget)
            ? draft.downPaymentBudget
            : '',
        monthly_installment_budget:
          !isRentRequest.value && hasValue(draft.monthlyInstallmentBudget)
            ? draft.monthlyInstallmentBudget
            : '',
        delivery_date: draft.preferredDeliveryDate || '',
        budget_currency: draft.budgetCurrency || filterOptions.currency || null,
        strict_filters: draft.strictFilters ? 1 : 0,
      },
    )
    if (request !== matchRequest || !show.value) return
    matches.value = result?.units || []
    matches.value.forEach((unit) => selectedUnitRecords.value.set(unit.name, unit))
    clearIncompatibleSelectedUnits()
    if (result?.currency) {
      filterOptions.currency = result.currency
      if (!draft.budgetCurrency) draft.budgetCurrency = result.currency
    }
    if (
      draft.strictFilters &&
      (hasValue(draft.downPaymentBudget) || hasValue(draft.monthlyInstallmentBudget)) &&
      !matches.value.length
    )
      draft.selectionNotice = __(
        'Exact finance filters exclude units with unknown payment-plan data. Clear Exact filters to compare those units without inventing affordability.',
      )
  } catch (error) {
    toast.error(
      error.messages?.[0] ||
        error.message ||
        __('Could not load matching properties.'),
    )
  } finally {
    if (request === matchRequest) matchesLoading.value = false
  }
}

function validateInterestRequirements({ requireResolution = true } = {}) {
  if (!draft.interestCategory) {
    toast.error(__('Select an interest category.'))
    return false
  }
  if (hasPropertyCriteria.value) {
    if (
      !draft.preferredDestination ||
      (isInventoryInterest.value && (!draft.preferredUnitType || !hasValue(matchBudget.value)))
    ) {
      toast.error(
        isRentRequest.value
          ? __('Destination, unit type, and maximum monthly rent are required.')
          : __('Destination, unit type, and maximum budget are required.'),
      )
      return false
    }
    if (
      draft.preferredUnitCategory &&
      draft.preferredUnitType &&
      filterOptions.unitTypeCategories?.[draft.preferredUnitType] &&
      filterOptions.unitTypeCategories[draft.preferredUnitType] !==
        draft.preferredUnitCategory
    ) {
      toast.error(
        __('Unit Type {0} is not in Unit Category {1}.', [
          draft.preferredUnitType,
          draft.preferredUnitCategory,
        ]),
      )
      return false
    }
    if (isRentRequest.value) {
      if (!isValidCurrencyAmount(draft.rentBudget, { required: isInventoryInterest.value })) {
        toast.error(__('Maximum monthly rent must be zero or a positive amount.'))
        return false
      }
    } else if (!isValidCurrencyAmount(draft.buyerBudget, { required: isInventoryInterest.value })) {
      toast.error(__('Maximum total budget must be zero or a positive amount.'))
      return false
    }
    if (
      !isRentRequest.value &&
      (!isValidCurrencyAmount(draft.downPaymentBudget) ||
        !isValidCurrencyAmount(draft.monthlyInstallmentBudget))
    ) {
      toast.error(__('Optional budget amounts must be zero or positive.'))
      return false
    }
    if (!draft.budgetCurrency && !filterOptions.currency) {
      toast.error(
        __('Set a budget currency before matching or saving; no currency is assumed.'),
      )
      return false
    }
  }
  if (draft.preferredDeliveryDate && !isIsoCalendarDate(draft.preferredDeliveryDate)) {
    toast.error(__('Select a valid delivery date.'))
    return false
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
    toast.error(
      isMatchRequested.value
        ? __('Select at least one matching inventory unit.')
        : __('Select matching units or choose Requested Unit.'),
    )
    return false
  }
  return true
}

function isUnitSelected(name) {
  return draft.selectedUnits.includes(name)
}

function toggleUnit(name) {
  const unit = matches.value.find((item) => item.name === name)
  if (unit) selectedUnitRecords.value.set(name, unit)
  draft.requestedUnit = false
  const selected = new Set(draft.selectedUnits)
  if (selected.has(name)) selected.delete(name)
  else selected.add(name)
  draft.selectedUnits = [...selected]
}

async function loadCompounds() {
  const request = ++compoundRequest
  if (!draft.preferredDestination) {
    availableCompounds.value = []
    if (draft.preferredProject) draft.preferredProject = ''
    return
  }
  try {
    const result = await call('real_estate_crm_customs.api.get_requirement_compounds', {
      destination: draft.preferredDestination,
      developer: draft.preferredDeveloper || null,
    })
    if (request !== compoundRequest || !show.value) return
    availableCompounds.value = result?.compounds || []
    if (result?.currency) {
      filterOptions.currency = result.currency
      if (!draft.budgetCurrency) draft.budgetCurrency = result.currency
    }
    const currentCompound = availableCompounds.value.find((item) => item.name === draft.preferredProject)
    if (draft.preferredProject && (!currentCompound || !compoundIsCompatible(currentCompound,
      draft.preferredDestination, draft.preferredDeveloper))) {
      draft.preferredProject = ''
      draft.selectionNotice = __('Incompatible Compound cleared after Destination or Developer changed.')
    }
    if (!draft.preferredProject && draft.preferredDeveloper && availableCompounds.value.length === 1) {
      draft.preferredProject = availableCompounds.value[0].name
    }
  } catch (error) {
    if (request === compoundRequest) {
      availableCompounds.value = []
      toast.error(error.messages?.[0] || error.message || __('Could not load eligible Compounds.'))
    }
  }
}

function clearIncompatibleSelectedUnits() {
  const criteria = {
    preferredDestination: draft.preferredDestination,
    preferredProject: draft.preferredProject,
    preferredDeveloper: draft.preferredDeveloper,
    inventorySearchScope: draft.inventorySearchScope,
  }
  const incompatible = selectedUnitCards.value.filter(
    (unit) => !selectedUnitIsCompatible(unit, criteria),
  )
  if (!incompatible.length) return
  const rejected = new Set(incompatible.map((unit) => unit.name))
  draft.selectedUnits = draft.selectedUnits.filter((name) => !rejected.has(name))
  draft.selectionNotice = __(
    'Incompatible draft unit selections were cleared after your Destination, Developer, Compound, or search-scope change.',
  )
}

function unitComparisons(unit) {
  const affordability = unit.affordability || {}
  const labels = [
    ['total_budget', __('Total'), affordability.total_budget],
    ['down_payment', __('Upfront'), affordability.down_payment],
    ['monthly_installment', __('Monthly'), affordability.monthly_installment],
    ['delivery', __('Delivery'), affordability.delivery],
  ]
  return labels.map(([key, label, value]) => ({
    key,
    label,
    value: value || __('Comparison unavailable'),
    className:
      value === 'Within budget' || value === 'Within deadline'
        ? 'bg-surface-green-1 text-ink-green-3'
        : value === 'Over budget' || value === 'Later than requested'
          ? 'bg-surface-amber-1 text-ink-amber-3'
          : 'bg-surface-gray-2 text-ink-gray-7',
  }))
}

function openUnit(unit) {
  const href = router.resolve({
    name: 'Real Estate Unit',
    params: { recordId: unit.name },
  }).href
  window.addEventListener('focus', loadMatches, { once: true })
  window.open(href, '_blank', 'noopener')
}

function onRequestedUnitChange() {
  if (draft.requestedUnit) draft.selectedUnits = []
}

function formatPrice(value, currency = activeBudgetCurrency.value) {
  if (value === null || value === undefined || value === '') return '—'
  return formatCurrencyAmount(value, currency)
}

function startCall() {
  callStarted.value = true
  emit('start-call', props.action)
}

function actionKey(item) {
  return `${item.action_type}::${item.purpose}`
}

function counterpartyOption(row, status, scope = {}) {
  const purpose = counterpartyMeetingPurpose(row, status)
  if (!purpose) return []
  const isOwner = purpose === 'Owner Meeting'
  return [
    {
      ...scope,
      action_type: 'Meeting',
      purpose,
      label: isOwner
        ? __('Meet this Resale unit owner')
        : __('Meet this Primary unit developer'),
      interest_rows: scope.interest_rows || [row.name],
      unit: row.unit,
      units: row.unit ? [row.unit] : [],
    },
  ]
}

function normalizedPolicyOptions() {
  return (props.context?.allowed_next_actions || [])
    .filter((item) => item?.action_type &&
      (item.action_type !== 'Meeting' || CANONICAL_MEETING_PURPOSES.includes(item.purpose)))
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
      ...counterpartyOption(selectedRow, 'Offer Accepted'),
      {
        action_type: 'Closing',
        purpose: 'Contract Signing',
        label: __('Begin closing — contract signing'),
        interest_rows: [draft.selectedOffer],
        unit: selectedRow?.unit,
        units,
      },
    ].map((item) => ({ ...item, key: actionKey(item) }))
  }
  if (draft.offerDecision === 'Change Requirements')
    return interestDrivenOptions()
  return []
}

function projectedInterestStatus() {
  const current = scopedInterest.value?.workflow_status || ''
  if (isOfferFollowUp.value && draft.contactResult === 'Answered') {
    return (
      {
        Viewed: 'Offer Viewed',
        'Offer Accepted': 'Offer Accepted',
        Rejected: 'Rejected',
        'Needs Alternatives': 'Superseded',
      }[draft.outcome] || current
    )
  }
  if (isOfferDecision.value) {
    return draft.offerDecision === 'Select an Offer'
      ? 'Offer Accepted'
      : draft.offerDecision === 'Change Requirements'
        ? 'Superseded'
        : current
  }
  if (isNegotiation.value)
    return draft.outcome === 'Declined' ? 'Rejected' : 'Negotiating'
  if (isShowing.value) {
    if (draft.outcome === 'Completed')
      return (
        {
          Interested: 'Shown - Interested',
          Considering: 'Shown - Considering',
          'No Feedback': 'Shown - Considering',
          Rejected: 'Rejected',
        }[draft.unitOutcome] || current
      )
    if (
      [
        'Buyer No Show',
        'Owner/Unit Unavailable',
        'Seller/Unit Unavailable',
        'Cancelled',
      ].includes(
        draft.outcome,
      )
    )
      return 'Negotiating'
  }
  if (isClosing.value) return closingProjectedStatus(draft.outcome, current)
  return current
}

function independentInterestOptions() {
  const row = scopedInterest.value
  if (!row) return []
  const status = projectedInterestStatus()
  const scope = {
    interest_rows: [row.name],
    unit: row.unit || null,
  }
  const options = []
  if (status === 'Requested') {
    if (['Resale', 'Primary'].includes(row.interest_category))
      options.push({
        ...scope,
        action_type: 'Add Interest',
        purpose: 'Match Requested Unit',
        label: __('Run Smart Match and link inventory'),
      })
    options.push(
      {
        ...scope,
        action_type: 'Call',
        purpose: 'Requirements Discovery',
        label: __('Follow up this request'),
      },
      {
        ...scope,
        action_type: 'Meeting',
        purpose: 'Explore Meeting',
        label: __('Explore this requirement'),
      },
    )
  }
  if (status === 'Matched') {
    options.push(
      {
        ...scope,
        action_type: 'Call',
        purpose: 'General Follow-up',
        label: __('Discuss this matched unit'),
      },
      {
        ...scope,
        action_type: 'Meeting',
        purpose: 'Explore Meeting',
        label: __('Explore this matched unit'),
      },
    )
  }
  if (['Offer Sent', 'Offer Viewed'].includes(status)) {
    options.push(
      {
        ...scope,
        action_type: 'Offer Decision',
        purpose: 'Offer Decision',
        label: __('Record this offer decision'),
      },
      {
        ...scope,
        action_type: 'Call',
        purpose: 'Offer Follow-up',
        label: __('Follow up this offer'),
      },
    )
  }
  if (
    [
      'Offer Accepted',
      'Negotiating',
      'Shown - Considering',
      'Shown - Interested',
    ].includes(status)
  ) {
    options.push(
      {
        ...scope,
        action_type: 'Negotiation Follow-up',
        purpose: 'Negotiation Follow-up',
        label: __('Continue this unit negotiation'),
      },
      {
        ...scope,
        action_type: 'Showing',
        purpose: 'Showing Confirmation',
        label: __('Schedule or hold this unit showing'),
      },
    )
    options.push(...counterpartyOption(row, status, scope))
    if (canBeginClosing(status))
      options.push({
        ...scope,
        action_type: 'Closing',
        purpose: 'Contract Signing',
        label: __('Begin closing — contract signing'),
      })
  }
  if (status === 'Closing') {
    options.push(
      {
        ...scope,
        action_type: 'Closing',
        purpose: 'Contract Signing',
        label: __('Contract-signing follow-up'),
      },
      ...counterpartyOption(row, status, scope),
    )
  }
  return options.map((item) => ({ ...item, key: actionKey(item) }))
}

function buildNextActionOptions() {
  let options = normalizedPolicyOptions()
  if (scopedInterest.value) options = independentInterestOptions()
  if (showInterestBlock.value) options = interestDrivenOptions()
  if (isOfferDecision.value) options = offerDecisionOptions()
  if (isSendOffer.value || (isClosing.value && draft.outcome === 'Contract Signed'))
    options = []
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
    ...buildInterestCriteriaPayload(draft),
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
  if (isClosing.value) {
    if (!draft.outcome)
      throw new Error(__('Select the contract-signing outcome.'))
    if (draft.outcome === 'Contract Signed') {
      if (!draft.contractReference)
        throw new Error(__('Contract reference is required for Contract Signed.'))
      if (!isIsoDateOnOrBeforeToday(draft.contractSignedDate))
        throw new Error(
          __('Contract signed date is required and cannot be in the future.'),
        )
    }
  }
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
    contract_reference:
      isClosing.value && draft.outcome === 'Contract Signed'
        ? draft.contractReference
        : null,
    contract_signed_date:
      isClosing.value && draft.outcome === 'Contract Signed'
        ? draft.contractSignedDate
        : null,
    signed_contract:
      isClosing.value && draft.outcome === 'Contract Signed'
        ? draft.signedContract || null
        : null,
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
  const counterpartyRow = counterpartyRows.value.find(
    (row) => row.name === draft.counterpartyInterestRow,
  )
  const showingRow = scopedRows.value.find(
    (row) => row.name === draft.showingInterestRow,
  )
  const interestRows = isCounterpartyMeeting.value
    ? draft.counterpartyInterestRow
      ? [draft.counterpartyInterestRow]
      : []
    : isShowing.value
      ? draft.showingInterestRow
        ? [draft.showingInterestRow]
        : []
      : isSendOffer.value
        ? [...draft.selectedInterestRows]
        : definition.interest_row_names || definition.interest_rows || []
  return {
    action_type: definition.action_type,
    purpose: definition.purpose,
    execute_now: scheduleOnly.value ? 0 : 1,
    scheduled_start: scheduleOnly.value
      ? draft.scheduledStart
      : frappeNowDateTime(),
    interest_rows: interestRows,
    unit: counterpartyRow?.unit || showingRow?.unit || definition.unit || null,
    notes: draft.notes || null,
  }
}

async function submitBundle() {
  if (!isBuyerLead(props.lead)) {
    toast.error(__('Buyer workflow actions require Party Role = Buyer.'))
    return
  }
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
      client_request_id: bundleRequestId.value || (bundleRequestId.value = createClientRequestId()),
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
    matchRequest += 1
    matches.value = []
    draft.selectedUnits = []
    draft.requestedUnit = false
    // Primary and International requests are always purchases.
    draft.dealType = normalizeDealType(draft.dealType, category)
    draft.inventorySearchScope = draft.inventorySearchScope === 'Both' &&
      draft.dealType !== DEAL_RENT
      ? 'Both' : scopeForCategory(category, '', draft.dealType)
    if (category) await loadFilterOptions()
  },
)
watch(
  () => draft.dealType,
  async (dealType, previous) => {
    if (!show.value || dealType === previous || previous === undefined) return
    matchRequest += 1
    matches.value = []
    draft.selectedUnits = []
    draft.inventorySearchScope = scopeForCategory(
      draft.interestCategory,
      dealType === DEAL_RENT ? '' : draft.inventorySearchScope,
      dealType,
    )
    if (draft.interestCategory) await loadFilterOptions()
  },
)
watch(
  () => draft.preferredUnitCategory,
  (category, previous) => {
    if (!show.value || category === previous || previous === undefined) return
    // A Unit Type from another category no longer fits the narrowed list.
    const typeCategory = filterOptions.unitTypeCategories?.[draft.preferredUnitType]
    if (category && draft.preferredUnitType && typeCategory && typeCategory !== category) {
      draft.preferredUnitType = ''
    }
  },
)

watch(
  () => [draft.preferredDestination, draft.preferredDeveloper],
  async () => {
    if (!showInterestBlock.value || !hasPropertyCriteria.value) return
    await loadCompounds()
    clearIncompatibleSelectedUnits()
  },
)

watch(
  () => [draft.preferredProject, draft.inventorySearchScope],
  async () => {
    if (draft.preferredProject && showInterestBlock.value) {
      let compound = availableCompounds.value.find((item) => item.name === draft.preferredProject)
      if (!compound && draft.preferredDestination) {
        const result = await call('real_estate_crm_customs.api.get_requirement_compounds', {
          destination: draft.preferredDestination,
        })
        compound = result?.compounds?.find((item) => item.name === draft.preferredProject)
      }
      if (compound && compound.destination === draft.preferredDestination) {
        draft.preferredDeveloper = compound.developer || ''
      } else if (draft.preferredProject) {
        draft.preferredProject = ''
      }
    }
    clearIncompatibleSelectedUnits()
  },
)

let matchRefreshTimer = null
watch(
  () => [
    draft.interestCategory,
    draft.dealType,
    draft.preferredDestination,
    draft.preferredUnitCategory,
    draft.preferredUnitType,
    draft.rentBudget,
    draft.buyerBudget,
    draft.downPaymentBudget,
    draft.monthlyInstallmentBudget,
    draft.preferredDeliveryDate,
    draft.budgetCurrency,
    draft.inventorySearchScope,
    draft.preferredProject,
    draft.preferredDeveloper,
    draft.preferredFinishing,
    draft.strictFilters,
  ],
  () => {
    matchRequest += 1
    clearTimeout(matchRefreshTimer)
    clearIncompatibleSelectedUnits()
    if (
      !showSmartMatch.value ||
      !draft.preferredDestination ||
      (isInventoryInterest.value && (!draft.preferredUnitType || !hasValue(matchBudget.value)))
    )
      return
    matchRefreshTimer = setTimeout(loadMatches, 450)
  },
)

watch(show, (value) => {
  if (value) resetDraft()
  else {
    compoundRequest += 1
    matchRequest += 1
    clearTimeout(matchRefreshTimer)
  }
})
onBeforeUnmount(() => clearTimeout(matchRefreshTimer))
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
