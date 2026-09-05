<template>
  <LayoutHeader>
    <template #left-header>
      <Breadcrumbs :items="breadcrumbs">
        <template #prefix="{ item }">
          <Icon v-if="item.icon" :icon="item.icon" class="mr-2 h-4" />
        </template>
      </Breadcrumbs>
    </template>
    <template v-if="!errorTitle" #right-header>
      <CustomActions
        v-if="document._actions?.length"
        :actions="document._actions"
      />
      <CustomActions
        v-if="document.actions?.length"
        :actions="document.actions"
      />
      <AssignTo v-model="assignees.data" doctype="CRM Lead" :docname="leadId" />
      <Tooltip
        v-if="doc?.status"
        :text="__('Status is updated automatically by workflow actions')"
      >
        <Button :label="statusLabel(doc.status)" iconRight="lock">
          <template #prefix>
            <IndicatorIcon :class="getLeadStatus(doc.status)?.color" />
          </template>
        </Button>
      </Tooltip>
      <Button
        :label="__('Convert to Deal')"
        variant="solid"
        @click="showConvertToDealModal = true"
      />
    </template>
  </LayoutHeader>
  <div v-if="doc.name" class="flex h-full overflow-hidden">
    <Tabs
      v-model="tabIndex"
      :tabs="tabs"
      class="flex flex-1 overflow-hidden flex-col [&_[role='tab']]:px-0 [&_[role='tab']]:shrink-0 [&_[role='tablist']]:px-5 [&_[role='tablist']::-webkit-scrollbar]:h-0 [&_[role='tablist']]:min-h-[45px] [&_[role='tablist']]:gap-7.5 [&_[role='tabpanel']:not([hidden])]:flex [&_[role='tabpanel']:not([hidden])]:grow"
    >
      <template #tab-panel>
        <div
          v-if="activeTabName === 'Properties'"
          class="flex flex-1 flex-col overflow-hidden"
        >
          <div
            class="flex items-center justify-between gap-3 border-b px-5 py-3"
          >
            <div>
              <div class="text-base font-medium text-ink-gray-9">
                {{ linkedPropertiesTitle }}
              </div>
              <div class="text-sm text-ink-gray-6">
                {{ linkedPropertiesDescription }}
              </div>
            </div>
            <div v-if="isSellerLead" class="flex shrink-0 gap-2">
              <Button
                :label="__('Add Property')"
                variant="solid"
                @click="addSellerProperty"
              />
              <Button
                :label="__('Assign Existing')"
                variant="subtle"
                @click="assignPropertyUnitToSeller"
              />
            </div>
          </div>
          <div class="flex-1 overflow-auto p-5">
            <div v-if="isBuyerLead" class="mb-5 flex flex-col gap-4">
              <!-- Card 1: Gated Actions (top) -->
              <div
                class="rounded border border-outline-gray-1 bg-surface-white p-4"
              >
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium text-ink-gray-9">
                      {{ __('Lead Actions') }}
                    </div>
                    <div class="text-xs text-ink-gray-6">
                      {{
                        __('Available actions based on current lead status: ')
                      }}
                      <span class="font-semibold">{{
                        doc.status || __('Fresh Lead')
                      }}</span>
                    </div>
                  </div>
                  <div
                    v-if="doc.lead_age"
                    class="rounded bg-surface-gray-2 px-3 py-1.5 text-xs font-medium text-ink-gray-7"
                  >
                    {{ __('Age') }}: {{ doc.lead_age }}
                  </div>
                </div>
                <!-- Gated Action Buttons -->
                <div class="flex flex-wrap gap-2">
                  <!-- Fresh Lead: Only Call and WhatsApp -->
                  <Button
                    :label="__('Call')"
                    variant="solid"
                    @click="triggerLeadCall"
                  />
                  <Button
                    :label="__('WhatsApp Message')"
                    variant="subtle"
                    @click="openWhatsAppWithSubject"
                  />
                  <!-- After call: Log Call button -->
                  <Button
                    v-if="callStarted || doc.last_call_outcome"
                    :label="__('Log Call Result')"
                    variant="solid"
                    theme="orange"
                    @click="openCallLogDialog"
                  />
                  <!-- Interested status: Schedule Next Action -->
                  <Button
                    v-if="isInterestedOrBeyond"
                    :label="__('Schedule Next Action')"
                    variant="solid"
                    theme="green"
                    @click="openNextActionDialog"
                  />
                  <!-- Log Meeting Result (when events exist) -->
                  <Button
                    v-if="isInterestedOrBeyond"
                    :label="__('Log Meeting Result')"
                    variant="subtle"
                    @click="openMeetingResultDialog"
                  />
                </div>
              </div>

              <!-- Card 2: Flags (No-Answer Tracking) -->
              <div
                class="rounded border border-outline-gray-1 bg-surface-white p-4"
              >
                <div class="mb-3">
                  <div class="text-sm font-medium text-ink-gray-9">
                    {{ __('Call Tracking Flags') }}
                  </div>
                </div>
                <div class="grid gap-3 text-sm md:grid-cols-3 xl:grid-cols-5">
                  <div
                    v-for="item in callFlagsRows"
                    :key="item.label"
                    class="rounded bg-surface-gray-1 p-3"
                  >
                    <div class="text-xs text-ink-gray-5">{{ item.label }}</div>
                    <div class="mt-1 font-medium text-ink-gray-9">
                      {{ item.value || __('—') }}
                    </div>
                  </div>
                </div>
              </div>

              <LeadProgressGraph
                :progress="leadProgress.data || {}"
                :loading="leadProgress.loading"
              />

              <!-- Card 3: Interest Details -->
              <div
                class="rounded border border-outline-gray-1 bg-surface-white p-4"
              >
                <div class="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium text-ink-gray-9">
                      {{ __('Interest Details') }}
                    </div>
                    <div class="text-xs text-ink-gray-6">
                      {{ __('Buyer requirements and preferences.') }}
                    </div>
                  </div>
                  <Button
                    :label="__('Edit')"
                    variant="subtle"
                    @click="editBuyerInterestPreferences"
                  />
                </div>
                <div class="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <div
                    v-for="item in buyerInterestPreferenceRows"
                    :key="item.label"
                    class="rounded bg-surface-gray-1 p-3"
                  >
                    <div class="text-xs text-ink-gray-5">{{ item.label }}</div>
                    <div class="mt-1 font-medium text-ink-gray-9">
                      {{ item.value || __('—') }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card 4: Add Inventory Units or Requests -->
              <div
                class="rounded border border-outline-gray-1 bg-surface-white p-4"
              >
                <div
                  class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div>
                    <div class="text-sm font-medium text-ink-gray-9">
                      {{ __('Linked Units & Requests') }}
                    </div>
                    <div class="text-xs text-ink-gray-6">
                      {{
                        __(
                          'Select available inventory units, or record a buyer request when the requirement is not currently in inventory.',
                        )
                      }}
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      :label="__('Add Interest')"
                      variant="solid"
                      @click="openInterestDeterminationDialog"
                    />
                    <Button
                      :label="__('Browse Units')"
                      variant="subtle"
                      @click="openUnitSelectionPopup"
                    />
                    <Button
                      :label="__('Edit Existing')"
                      variant="subtle"
                      @click="openExistingInterestEditor"
                    />
                  </div>
                </div>
              </div>
            </div>
            <!-- Linked Properties Table -->
            <div
              v-if="linkedProperties.loading"
              class="rounded border border-outline-gray-1 p-5 text-sm text-ink-gray-6"
            >
              {{ __('Loading linked properties...') }}
            </div>
            <div
              v-else-if="!visibleLinkedPropertyRows.length"
              class="rounded border border-outline-gray-1 p-5 text-sm text-ink-gray-6"
            >
              {{ linkedPropertiesEmptyText }}
            </div>
            <div
              v-else
              class="overflow-hidden rounded border border-outline-gray-1"
            >
              <LeadInterestGroups
                v-if="isBuyerLead"
                :rows="visibleLinkedPropertyRows"
                :can-review="canReviewInterestDeletion"
                @edit="editInterestRecord"
                @request-delete="requestInterestDeletion"
                @review="reviewInterestDeletion"
              />
              <table v-else class="w-full text-left text-sm">
                <thead class="border-b bg-surface-gray-1 text-ink-gray-6">
                  <tr>
                    <th class="px-4 py-3 font-medium">
                      {{ __('Property Code / SKU') }}
                    </th>
                    <th class="px-4 py-3 font-medium">
                      {{ __('Property Title / Unit') }}
                    </th>
                    <th class="px-4 py-3 font-medium">
                      {{ __('Compound / Project') }}
                    </th>
                    <th class="px-4 py-3 font-medium">{{ __('Developer') }}</th>
                    <th class="px-4 py-3 font-medium">{{ __('Unit Type') }}</th>
                    <th class="px-4 py-3 font-medium">
                      {{ __('Finishing Type') }}
                    </th>
                    <th class="px-4 py-3 font-medium">
                      {{ __('Target Asking Price') }}
                    </th>
                    <th class="px-4 py-3 font-medium">{{ __('Status') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in visibleLinkedPropertyRows"
                    :key="row.name"
                    class="border-b last:border-b-0"
                  >
                    <td class="px-4 py-3 text-ink-gray-9">
                      {{ row.sku || row.property_code || __('—') }}
                    </td>
                    <td class="px-4 py-3 text-ink-gray-8">
                      {{ row.property_title || row.name || __('—') }}
                    </td>
                    <td class="px-4 py-3 text-ink-gray-8">
                      {{ row.project || __('—') }}
                    </td>
                    <td class="px-4 py-3 text-ink-gray-8">
                      {{ row.developer || __('—') }}
                    </td>
                    <td class="px-4 py-3 text-ink-gray-8">
                      {{ row.unit_type || __('—') }}
                    </td>
                    <td class="px-4 py-3 text-ink-gray-8">
                      {{ row.finishing_type || __('—') }}
                    </td>
                    <td class="px-4 py-3 text-ink-gray-8">
                      {{ formatPrice(row.price) }}
                    </td>
                    <td class="px-4 py-3 text-ink-gray-8">
                      {{ row.status || __('—') }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <LeadSmartEvents
          v-else-if="activeTabName === 'Events'"
          ref="smartEvents"
          :lead-id="leadId"
        />
        <div
          v-else-if="activeTabName === 'Comments'"
          class="flex flex-1 flex-col overflow-hidden"
        >
          <div
            class="mx-5 mt-4 rounded border border-outline-gray-1 bg-surface-gray-1 p-4"
          >
            <div
              class="text-xs font-medium uppercase tracking-wide text-ink-gray-5"
            >
              {{ __('Latest Status-changing Action') }}
            </div>
            <div
              v-if="lastStatusAction"
              class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
            >
              <span class="font-semibold text-ink-gray-9">{{
                lastStatusAction.action
              }}</span>
              <span class="text-ink-gray-6">{{ lastStatusAction.status }}</span>
              <span class="text-xs text-ink-gray-5">{{
                formatDateTime(lastStatusAction.transitioned_on)
              }}</span>
            </div>
            <div v-else class="mt-2 text-sm text-ink-gray-5">
              {{ __('No status-changing action has been recorded yet.') }}
            </div>
          </div>
          <Activities
            ref="activities"
            v-model:reload="reload"
            v-model:tabIndex="tabIndex"
            doctype="CRM Lead"
            :docname="leadId"
            :tabs="tabs"
            @beforeSave="beforeStatusChange"
            @afterSave="reloadResources"
          />
        </div>
        <Activities
          v-else
          ref="activities"
          v-model:reload="reload"
          v-model:tabIndex="tabIndex"
          doctype="CRM Lead"
          :docname="leadId"
          :tabs="tabs"
          @beforeSave="beforeStatusChange"
          @afterSave="reloadResources"
        />
      </template>
    </Tabs>
    <Resizer class="flex flex-col justify-between border-l" side="right">
      <div
        class="flex h-[45px] cursor-copy items-center border-b px-5 py-2.5 text-lg font-medium text-ink-gray-9"
        @click="copyToClipboard(leadId)"
      >
        {{ __(leadId) }}
      </div>
      <FileUploader
        :validateFile="validateIsImageFile"
        @success="(file) => updateField('image', file.file_url)"
      >
        <template #default="{ openFileSelector }">
          <div class="flex items-center justify-start gap-5 border-b p-5">
            <div class="group relative size-12">
              <Avatar
                size="3xl"
                class="size-12"
                :label="title"
                :image="doc.image"
              />
              <component
                :is="doc.image ? Dropdown : 'div'"
                v-bind="
                  doc.image
                    ? {
                        options: [
                          {
                            icon: 'upload',
                            label: doc.image
                              ? __('Change Image')
                              : __('Upload Image'),
                            onClick: openFileSelector,
                          },
                          {
                            icon: 'trash-2',
                            label: __('Remove Image'),
                            onClick: () => updateField('image', ''),
                          },
                        ],
                      }
                    : { onClick: openFileSelector }
                "
                class="!absolute bottom-0 left-0 right-0"
              >
                <div
                  class="z-1 absolute bottom-0.5 left-0 right-0.5 flex h-9 cursor-pointer items-center justify-center rounded-b-full bg-black bg-opacity-40 pt-3 opacity-0 duration-300 ease-in-out group-hover:opacity-100"
                  style="
                    -webkit-clip-path: inset(12px 0 0 0);
                    clip-path: inset(12px 0 0 0);
                  "
                >
                  <CameraIcon class="size-4 cursor-pointer text-white" />
                </div>
              </component>
            </div>
            <div class="flex flex-col gap-2.5 truncate">
              <Tooltip :text="doc.lead_name || __('Set First Name')">
                <div class="truncate text-2xl font-medium text-ink-gray-9">
                  {{ title }}
                </div>
              </Tooltip>
              <div class="flex gap-1.5">
                <Button
                  :tooltip="__('Open WhatsApp Chat')"
                  :icon="WhatsAppIcon"
                  @click="openWhatsAppDirect"
                />
                <Button
                  :tooltip="__('Call Lead')"
                  :icon="PhoneIcon"
                  @click="triggerLeadCall"
                />
                <Button
                  :tooltip="__('Attach a File')"
                  :icon="AttachmentIcon"
                  @click="showFilesUploader = true"
                />
                <Button
                  v-if="canDelete"
                  :tooltip="__('Delete')"
                  variant="subtle"
                  theme="red"
                  icon="trash-2"
                  @click="deleteLead"
                />
              </div>
              <ErrorMessage :message="__(error)" />
            </div>
          </div>
        </template>
      </FileUploader>
      <SLASection
        v-if="doc.sla_status"
        v-model="doc"
        @updateField="updateField"
      />
      <div
        v-if="sections.data"
        class="flex flex-1 flex-col justify-between overflow-hidden"
      >
        <SidePanelLayout
          :sections="sections.data"
          doctype="CRM Lead"
          :docname="leadId"
          @reload="sections.reload"
          @beforeFieldChange="beforeStatusChange"
          @afterFieldChange="reloadResources"
        />
      </div>
    </Resizer>
  </div>
  <ErrorPage
    v-else-if="errorTitle"
    :errorTitle="errorTitle"
    :errorMessage="errorMessage"
  />
  <ConvertToDealModal
    v-if="showConvertToDealModal"
    v-model="showConvertToDealModal"
    :lead="doc"
  />
  <FilesUploader
    v-model="showFilesUploader"
    doctype="CRM Lead"
    :docname="leadId"
    @after="
      () => {
        activities?.all_activities?.reload()
        changeTabTo('attachments')
      }
    "
  />
  <DeleteLinkedDocModal
    v-if="showDeleteLinkedDocModal"
    v-model="showDeleteLinkedDocModal"
    :doctype="'CRM Lead'"
    :docname="leadId"
    name="Leads"
  />
  <LostReasonModal
    v-if="showLostReasonModal"
    v-model="showLostReasonModal"
    doctype="CRM Lead"
    :document="document"
  />
  <UnitSelectionDialog
    v-model="showUnitSelectionDialog"
    :lead-id="leadId"
    @units-added="onUnitsAdded"
  />
</template>
<script setup>
import DeleteLinkedDocModal from '@/components/DeleteLinkedDocModal.vue'
import ErrorPage from '@/components/ErrorPage.vue'
import Icon from '@/components/Icon.vue'
import Resizer from '@/components/Resizer.vue'
import ActivityIcon from '@/components/Icons/ActivityIcon.vue'
import CommentIcon from '@/components/Icons/CommentIcon.vue'
import DetailsIcon from '@/components/Icons/DetailsIcon.vue'
import EventIcon from '@/components/Icons/EventIcon.vue'
import PhoneIcon from '@/components/Icons/PhoneIcon.vue'
import IndicatorIcon from '@/components/Icons/IndicatorIcon.vue'
import CameraIcon from '@/components/Icons/CameraIcon.vue'
import LinkIcon from '@/components/Icons/LinkIcon.vue'
import AttachmentIcon from '@/components/Icons/AttachmentIcon.vue'
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import LostReasonModal from '@/components/Modals/LostReasonModal.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import Activities from '@/components/Activities/Activities.vue'
import AssignTo from '@/components/AssignTo.vue'
import FilesUploader from '@/components/FilesUploader/FilesUploader.vue'
import SidePanelLayout from '@/components/SidePanelLayout.vue'
import SLASection from '@/components/SLASection.vue'
import CustomActions from '@/components/CustomActions.vue'
import ConvertToDealModal from '@/components/Modals/ConvertToDealModal.vue'
import UnitSelectionDialog from '@/components/Modals/UnitSelectionDialog.vue'
import LeadProgressGraph from '@/components/LeadProgressGraph.vue'
import LeadSmartEvents from '@/components/LeadSmartEvents.vue'
import LeadInterestGroups from '@/components/LeadInterestGroups.vue'
import {
  setupCustomizations,
  copyToClipboard,
  validateIsImageFile,
  isTranslatable,
} from '@/utils'
import { getView } from '@/utils/view'
import { renderFieldLayoutDialog } from '@/utils/renderFieldLayoutDialog'
import { getSettings } from '@/stores/settings'
import { globalStore } from '@/stores/global'
import { statusesStore } from '@/stores/statuses'
import { getMeta } from '@/stores/meta'
import { useDocument } from '@/data/document'
import { callEnabled } from '@/composables/telephony'
import {
  createResource,
  FileUploader,
  Dropdown,
  Tooltip,
  Avatar,
  Tabs,
  Breadcrumbs,
  call,
  usePageMeta,
  toast,
} from 'frappe-ui'
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useActiveTabManager } from '@/composables/useActiveTabManager'

const { brand } = getSettings()
const { $dialog, $socket, makeCall } = globalStore()
const { getLeadStatus } = statusesStore()
const { doctypeMeta } = getMeta('CRM Lead')

const route = useRoute()
const router = useRouter()

const props = defineProps({
  leadId: { type: String, required: true },
})

const reload = ref(false)
const activities = ref(null)
const smartEvents = ref(null)
const errorTitle = ref('')
const errorMessage = ref('')
const showDeleteLinkedDocModal = ref(false)
const showConvertToDealModal = ref(false)
const showFilesUploader = ref(false)
const showUnitSelectionDialog = ref(false)
const callStarted = ref(false)

const { triggerOnRender, assignees, permissions, document, scripts, error } =
  useDocument('CRM Lead', props.leadId)

const canDelete = computed(() => permissions.data?.permissions?.delete || false)

const doc = computed(() => document.doc || {})
const isBuyerLead = computed(() => doc.value.party_type !== 'Seller')
const isSellerLead = computed(() => doc.value.party_type === 'Seller')
const isInterestedOrBeyond = computed(() => {
  const s = doc.value.status
  return (
    doc.value.interest_status === 'Interested' ||
    (s && !['New', 'Fresh Lead'].includes(s))
  )
})

onMounted(async () => {
  if (document.doc) await triggerOnRender()
})

watch(error, (err) => {
  if (err) {
    errorTitle.value = __(
      err.exc_type == 'DoesNotExistError'
        ? 'Document not found'
        : 'Error occurred',
    )
    errorMessage.value = __(err.messages?.[0] || 'An error occurred')
  } else {
    errorTitle.value = ''
    errorMessage.value = ''
  }
})

watch(
  () => document.doc,
  async (_doc) => {
    if (scripts.data?.length) {
      let s = await setupCustomizations(scripts.data, {
        doc: _doc,
        $dialog,
        $socket,
        router,
        toast,
        updateField,
        createToast: toast.create,
        deleteDoc: deleteLead,
        call,
      })
      document._actions = s.actions || []
      document._statuses = s.statuses || []
    }
  },
  { once: true },
)

const breadcrumbs = computed(() => {
  let items = [{ label: __('Leads'), route: { name: 'Leads' } }]

  if (route.query.view || route.query.viewType) {
    let view = getView(route.query.view, route.query.viewType, 'CRM Lead')
    if (view) {
      items.push({
        label: __(view.label),
        icon: view.icon,
        route: {
          name: 'Leads',
          params: { viewType: route.query.viewType },
          query: { view: route.query.view },
        },
      })
    }
  }

  items.push({
    label: title.value,
    route: { name: 'Lead', params: { leadId: props.leadId } },
  })
  return items
})

const title = computed(() => {
  let t = doctypeMeta.value?.title_field || 'name'
  return doc.value?.[t] || props.leadId
})

usePageMeta(() => {
  return { title: title.value, icon: brand.favicon }
})

const tabs = computed(() => {
  return [
    {
      name: 'Data',
      label: __('Data'),
      icon: DetailsIcon,
    },
    {
      name: 'Properties',
      label: isBuyerLead.value ? __('Interest') : __('Properties'),
      icon: LinkIcon,
    },
    {
      name: 'Events',
      label: __('Event'),
      icon: EventIcon,
    },
    {
      name: 'Comments',
      label: __('Comments'),
      icon: CommentIcon,
    },
    {
      name: 'Activity',
      label: __('Activity'),
      icon: ActivityIcon,
    },
  ]
})

const { tabIndex, changeTabTo } = useActiveTabManager(tabs, 'lastLeadTab')

const activeTabName = computed(() => tabs.value[tabIndex.value]?.name)

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------
const linkedProperties = createResource({
  url: 'real_estate_crm_customs.api.get_lead_linked_units',
  cache: ['leadLinkedProperties', props.leadId],
  params: { lead: props.leadId },
  auto: true,
})

const linkedPropertyRows = computed(() => linkedProperties.data || [])

const leadProgress = createResource({
  url: 'real_estate_crm_customs.api.get_lead_progress',
  cache: ['leadProgress', props.leadId],
  params: { lead: props.leadId },
  auto: true,
})

const interestWorkflow = createResource({
  url: 'real_estate_crm_customs.api.get_interest_workflow_context',
  cache: ['interestWorkflow', props.leadId],
  params: { lead: props.leadId },
  auto: true,
})

const lastStatusAction = computed(
  () => leadProgress.data?.last_status_action || null,
)
const canReviewInterestDeletion = computed(
  () => interestWorkflow.data?.can_review_deletions || false,
)

const visibleLinkedPropertyRows = computed(() => {
  if (isSellerLead.value) {
    return linkedPropertyRows.value.filter(
      (row) => row.owner_lead === props.leadId,
    )
  }
  return linkedPropertyRows.value.filter(
    (row) => row.relationship !== 'Seller Unit',
  )
})

const linkedPropertiesTitle = computed(() =>
  isBuyerLead.value ? __('Interest') : __('Properties'),
)

const linkedPropertiesDescription = computed(() =>
  isBuyerLead.value
    ? __('Buyer interest details plus one or many selected inventory units.')
    : __(
        'Seller property onboarding list: property identity, compound, developer, type, finishing, asking price, and status.',
      ),
)

const linkedPropertiesEmptyText = computed(() =>
  isBuyerLead.value
    ? __('No interested units linked to this buyer lead yet.')
    : __('No seller properties assigned to this lead yet.'),
)

const sections = createResource({
  url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_sidepanel_sections',
  cache: ['sidePanelSections', 'CRM Lead'],
  params: { doctype: 'CRM Lead' },
  auto: true,
})

// ---------------------------------------------------------------------------
// Computed Rows
// ---------------------------------------------------------------------------
const buyerInterestPreferenceRows = computed(() => [
  { label: __('Preferred Area'), value: formatPreferredArea() },
  { label: __('Unit Type'), value: doc.value.preferred_unit_type },
  { label: __('Developer'), value: doc.value.preferred_developer },
  { label: __('Compound'), value: doc.value.preferred_compound },
  { label: __('Finishing Type'), value: doc.value.preferred_finishing_type },
  { label: __('Delivery Time'), value: doc.value.preferred_delivery_time },
  { label: __('Budget'), value: formatPrice(doc.value.buyer_budget) },
  {
    label: __('Primary Buyer'),
    value: doc.value.is_primary_buyer ? __('Yes') : __('No'),
  },
])

const callFlagsRows = computed(() => [
  {
    label: __('Interest Status'),
    value: doc.value.interest_status || __('\u2014'),
  },
  {
    label: __('Current No-Answer Streak'),
    value: doc.value.no_answer_consecutive_count || 0,
  },
  {
    label: __('Total No-Answer History'),
    value: doc.value.no_answer_total_count || 0,
  },
  {
    label: __('Last Call Outcome'),
    value: doc.value.last_call_outcome || __('\u2014'),
  },
])

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------
function formatPrice(value) {
  if (value === null || value === undefined || value === '') return __('—')
  return value
}

function formatPreferredArea() {
  if (!doc.value.preferred_area && !doc.value.buyer_budget) return ''
  return [doc.value.preferred_area, doc.value.area_unit]
    .filter(Boolean)
    .join(' ')
}

// ---------------------------------------------------------------------------
// State Update Helper
// ---------------------------------------------------------------------------
function updateLeadActionState(result) {
  if (!result) return
  ;[
    'status',
    'no_answer_consecutive_count',
    'no_answer_total_count',
    'last_call_outcome',
    'last_call_at',
    'is_primary_buyer',
    'interest_status',
    'previous_status',
  ].forEach((fieldname) => {
    if (Object.hasOwn(result, fieldname)) {
      doc.value[fieldname] = result[fieldname]
    }
  })
}

// ---------------------------------------------------------------------------
// 1. WhatsApp with Subject (Gated Action)
// ---------------------------------------------------------------------------
async function openWhatsAppWithSubject() {
  let values = await renderFieldLayoutDialog({
    title: __('WhatsApp Message — Enter Subject'),
    fields: [
      {
        fieldname: 'subject',
        fieldtype: 'Small Text',
        label: __('Message Subject / Content'),
        reqd: 1,
        default: __(
          'Hello, this is a follow-up regarding your real estate inquiry.',
        ),
      },
    ],
    submitLabel: __('Open WhatsApp'),
  })

  if (!values?.subject) return

  try {
    const result = await call(
      'real_estate_crm_customs.api.record_whatsapp_subject',
      {
        lead: props.leadId,
        subject: values.subject,
      },
    )
    activities.value?.all_activities?.reload?.()
    if (result?.whatsapp_url) {
      window.open(result.whatsapp_url, '_blank')
    }
    toast.success(__('WhatsApp message recorded and chat opened'))
  } catch (err) {
    toast.error(
      err.messages?.[0] ||
        err.message ||
        __('Error recording WhatsApp message'),
    )
  }
}

// Direct WhatsApp (sidebar button — no subject recording)
function openWhatsAppDirect() {
  const number = doc.value.whatsapp_number || doc.value.mobile_no
  if (!number) {
    toast.error(
      __('Please set a WhatsApp number or mobile number for this lead'),
    )
    return
  }
  // Phone fieldtype stores as +CC-XXXXXXXXXX (e.g. +20-1070009839)
  // Strip non-digit chars for wa.me URL (needs just digits with country code)
  const fullPhone = number.replace(/[^\d]/g, '')
  window.open(`https://wa.me/${fullPhone}`, '_blank')
}

// ---------------------------------------------------------------------------
// 2. Call (trigger phone call)
// ---------------------------------------------------------------------------
function triggerLeadCall() {
  const number = doc.value.mobile_no || doc.value.whatsapp_number
  if (!number) {
    toast.error(__('Please set a mobile number for this lead'))
    return
  }
  // Phone fieldtype stores as +CC-XXXXXXXXXX (e.g. +20-1070009839)
  // For tel: URI, replace hyphen with nothing to get +CCXXXXXXXXXX
  const fullPhone = number.replace(/-/g, '')
  callStarted.value = true
  if (callEnabled.value) {
    makeCall(fullPhone)
    return
  }
  window.open(`tel:${fullPhone}`, '_self')
}

// ---------------------------------------------------------------------------
// 3. Call Log Dialog — Sequential: Outcome → Interest → Next Action
// ---------------------------------------------------------------------------
async function openCallLogDialog() {
  const contactResult = await renderFieldLayoutDialog({
    title: __('Log Call Result'),
    fields: [
      {
        fieldname: 'outcome',
        fieldtype: 'Select',
        label: __('Contact Result'),
        options: '\nAnswered\nNo Answer',
        reqd: 1,
      },
    ],
    submitLabel: __('Continue'),
  })
  if (!contactResult?.outcome) return

  if (contactResult.outcome === 'No Answer') {
    const scheduleValues = await renderFieldLayoutDialog({
      title: __('Schedule Next Call Attempt'),
      fields: [
        {
          fieldname: 'schedule_next_call',
          fieldtype: 'Datetime',
          label: __('Next Call Date & Time'),
          reqd: 1,
        },
      ],
      submitLabel: __('Save & Schedule'),
    })
    if (!scheduleValues?.schedule_next_call) return

    try {
      const result = await call(
        'real_estate_crm_customs.api.record_call_outcome',
        {
          lead: props.leadId,
          outcome: 'No Answer',
          schedule_next_call: scheduleValues.schedule_next_call,
        },
      )
      updateLeadActionState(result)
      reloadActionWeb()
      toast.success(__('No-answer recorded. Next call scheduled.'))
    } catch (err) {
      toast.error(
        err.messages?.[0] || err.message || __('Error recording call outcome'),
      )
    }
    return
  }

  try {
    const result = await call(
      'real_estate_crm_customs.api.record_call_outcome',
      {
        lead: props.leadId,
        outcome: 'Answered',
      },
    )
    updateLeadActionState(result)
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Error recording call outcome'),
    )
    return
  }

  const qualification = await renderFieldLayoutDialog({
    title: __('Mandatory Call Outcome'),
    fields: [
      {
        fieldname: 'interest_outcome',
        fieldtype: 'Select',
        label: __('Qualification Outcome'),
        options: '\nInterested\nNot Interested',
        reqd: 1,
      },
    ],
    submitLabel: __('Save Outcome'),
  })
  if (!qualification?.interest_outcome) return

  const isInterested = qualification.interest_outcome === 'Interested'
  try {
    const result = await call(
      'real_estate_crm_customs.api.record_interest_determination',
      {
        lead: props.leadId,
        interested: isInterested ? 1 : 0,
        qualification_only: isInterested ? 1 : 0,
      },
    )
    updateLeadActionState(result)
    reloadActionWeb()
  } catch (err) {
    toast.error(
      err.messages?.[0] ||
        err.message ||
        __('Error recording call qualification'),
    )
    return
  }

  if (!isInterested) {
    toast.success(__('Call logged as Not Interested.'))
    return
  }

  const actionValues = await renderFieldLayoutDialog({
    title: __('Interested — Next Action Required'),
    fields: [
      {
        fieldname: 'next_action',
        fieldtype: 'Select',
        label: __('Next Action'),
        options: '\nAdd Interest\nMeeting\nShowing\nNext Call',
        reqd: 1,
      },
    ],
    submitLabel: __('Continue'),
  })
  if (!actionValues?.next_action) return

  if (actionValues.next_action === 'Add Interest') {
    await openInterestDeterminationDialog()
  } else if (actionValues.next_action === 'Meeting') {
    await openNextActionDialog('Meeting')
  } else if (actionValues.next_action === 'Showing') {
    await openNextActionDialog('Showing')
  } else if (actionValues.next_action === 'Next Call') {
    await openNextActionDialog('Call')
  }
}

// ---------------------------------------------------------------------------
// 4. Interest Determination Dialog
// ---------------------------------------------------------------------------
async function openInterestDeterminationDialog() {
  const existingInterests = visibleLinkedPropertyRows.value.filter(
    (row) => row.interest_row_name,
  )
  if (existingInterests.length) {
    const choice = await renderFieldLayoutDialog({
      title: __('Interest Already Recorded'),
      fields: [
        {
          fieldname: 'action',
          fieldtype: 'Select',
          label: __('Choose how to continue'),
          options: '\nAdd New Interest\nEdit Existing Interest',
          reqd: 1,
        },
      ],
      submitLabel: __('Continue'),
    })
    if (!choice?.action) return
    if (choice.action === 'Edit Existing Interest') {
      await openExistingInterestEditor()
      return
    }
  }

  const interestValues = await renderFieldLayoutDialog({
    title: __('Add Interest'),
    size: 'xl',
    fields: [
      {
        fieldname: 'interest_category',
        fieldtype: 'Select',
        label: __('Interest Category'),
        options: '\nResale\nPrimary\nBrokerage Request\nInternational',
        reqd: 1,
      },
      {
        fieldname: 'unit',
        fieldtype: 'Link',
        label: __('Available Unit'),
        options: 'Real Estate Unit',
        depends_on: "eval:['Resale','Primary'].includes(doc.interest_category)",
        mandatory_depends_on:
          "eval:['Resale','Primary'].includes(doc.interest_category)",
        get_query: () => ({ filters: { status: 'Available' } }),
      },
      {
        fieldname: 'request_notes',
        fieldtype: 'Small Text',
        label: __('Brokerage Requirements'),
        depends_on: "eval:doc.interest_category=='Brokerage Request'",
        mandatory_depends_on: "eval:doc.interest_category=='Brokerage Request'",
      },
      {
        fieldname: 'international_type',
        fieldtype: 'Select',
        label: __('International Category'),
        options: '\nStocks\nCharity Work\nReal Estate',
        depends_on: "eval:doc.interest_category=='International'",
        mandatory_depends_on: "eval:doc.interest_category=='International'",
      },
      {
        fieldname: 'international_country',
        fieldtype: 'Link',
        label: __('Country'),
        options: 'Country',
        depends_on: "eval:doc.interest_category=='International'",
        mandatory_depends_on: "eval:doc.interest_category=='International'",
      },
      {
        fieldname: 'international_details',
        fieldtype: 'Small Text',
        label: __('International Request Details'),
        depends_on: "eval:doc.interest_category=='International'",
      },
      {
        fieldname: 'preferred_area',
        fieldtype: 'Data',
        label: __('Preferred Location / Area'),
      },
      {
        fieldname: 'preferred_unit_type',
        fieldtype: 'Select',
        label: __('Unit Type'),
        options:
          '\nApartment\nDuplex\nTownhouse\nVilla\nChalet\nStudio\nPenthouse',
      },
      {
        fieldname: 'buyer_budget',
        fieldtype: 'Currency',
        label: __('Budget'),
      },
    ],
    submitLabel: __('Save Interest'),
  })
  if (!interestValues?.interest_category) return

  try {
    const interestData = {
      interest_category: interestValues.interest_category,
      units: interestValues.unit ? [interestValues.unit] : [],
      request_notes: interestValues.request_notes || null,
      international_type: interestValues.international_type || null,
      international_country: interestValues.international_country || null,
      international_details: interestValues.international_details || null,
      preferred_area: interestValues.preferred_area || null,
      preferred_unit_type: interestValues.preferred_unit_type || null,
      buyer_budget: interestValues.buyer_budget || null,
    }
    const result = await call(
      'real_estate_crm_customs.api.record_interest_determination',
      {
        lead: props.leadId,
        interested: 1,
        is_primary_buyer:
          interestValues.interest_category === 'Primary' ? 1 : 0,
        interest_data: JSON.stringify(interestData),
      },
    )
    updateLeadActionState(result)
    reloadActionWeb()
    toast.success(__('Interest added successfully.'))
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Error recording interest'),
    )
  }
}

// ---------------------------------------------------------------------------
// 5. Next Action Scheduling Dialog
// ---------------------------------------------------------------------------
async function openNextActionDialog(defaultActionType = null) {
  let values = await renderFieldLayoutDialog({
    title: __('Schedule Next Action'),
    size: 'lg',
    fields: [
      {
        fieldname: 'action_type',
        fieldtype: 'Select',
        label: __('Action Type'),
        options: '\nCall\nMeeting\nShowing\nSend Offer',
        reqd: 1,
        default: defaultActionType || '',
      },
      {
        fieldname: 'starts_on',
        fieldtype: 'Datetime',
        label: __('Scheduled Date & Time'),
        reqd: 1,
      },
      {
        fieldname: 'subject',
        fieldtype: 'Data',
        label: __('Subject / Title'),
      },
      {
        fieldname: 'notes',
        fieldtype: 'Small Text',
        label: __('Notes'),
      },
      {
        fieldname: 'target_unit',
        fieldtype: 'Link',
        label: __('Target Unit (for Showing)'),
        options: 'Real Estate Unit',
        depends_on: "eval:doc.action_type=='Showing'",
        mandatory_depends_on: "eval:doc.action_type=='Showing'",
      },
    ],
    submitLabel: __('Schedule'),
  })

  if (!values?.action_type || !values?.starts_on) return

  try {
    const result = await call(
      'real_estate_crm_customs.api.schedule_next_action',
      {
        lead: props.leadId,
        action_type: values.action_type,
        starts_on: values.starts_on,
        subject: values.subject || null,
        notes: values.notes || null,
        target_unit: values.target_unit || null,
      },
    )
    updateLeadActionState(result)
    reloadActionWeb()
    let msg = __('Next action scheduled: {0}', [values.action_type])
    if (result?.unit_showing_recorded) {
      msg += ' ' + __('(Showing recorded on unit and seller lead)')
    }
    toast.success(msg)
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Error scheduling next action'),
    )
  }
}

// ---------------------------------------------------------------------------
// 6. Meeting/Showing Result Dialog
// ---------------------------------------------------------------------------
async function openMeetingResultDialog() {
  // First fetch upcoming events for this lead
  let events
  try {
    events = await call(
      'real_estate_crm_customs.api.get_lead_upcoming_events',
      {
        lead: props.leadId,
      },
    )
  } catch {
    toast.error(__('Could not load events'))
    return
  }

  if (!events || !events.length) {
    toast.info(__('No pending meetings or showings to log results for.'))
    return
  }

  // Build event options
  const eventOptions = events
    .map((e) => `${e.name} — ${e.subject} (${e.starts_on})`)
    .join('\n')

  let values = await renderFieldLayoutDialog({
    title: __('Log Meeting / Showing Result'),
    size: 'lg',
    fields: [
      {
        fieldname: 'event_selection',
        fieldtype: 'Select',
        label: __('Select Event'),
        options: '\n' + eventOptions,
        reqd: 1,
      },
      {
        fieldname: 'result',
        fieldtype: 'Select',
        label: __('Result'),
        options: '\nDone\nCancelled\nRescheduled',
        reqd: 1,
      },
      {
        fieldname: 'result_note',
        fieldtype: 'Small Text',
        label: __('Result Notes (mandatory if Done)'),
        mandatory_depends_on: "eval:doc.result=='Done'",
      },
      {
        fieldname: 'reschedule_to',
        fieldtype: 'Datetime',
        label: __('Reschedule To (new date/time)'),
        depends_on: "eval:doc.result=='Rescheduled'",
        mandatory_depends_on: "eval:doc.result=='Rescheduled'",
      },
      {
        fieldname: 'target_unit',
        fieldtype: 'Link',
        label: __('Related Unit (if Showing)'),
        options: 'Real Estate Unit',
      },
    ],
    submitLabel: __('Log Result'),
  })

  if (!values?.event_selection || !values?.result) return

  // Extract event name from selection
  const eventName = values.event_selection.split(' — ')[0]

  try {
    await call('real_estate_crm_customs.api.log_meeting_result', {
      lead: props.leadId,
      event_name: eventName,
      result: values.result,
      result_note: values.result_note || null,
      reschedule_to: values.reschedule_to || null,
      target_unit: values.target_unit || null,
    })
    reloadActionWeb()
    toast.success(__('Meeting result logged: {0}', [values.result]))

    // After Done or Cancelled → prompt next action
    if (values.result === 'Done' || values.result === 'Cancelled') {
      await openNextActionDialog()
    }
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Error logging meeting result'),
    )
  }
}

// ---------------------------------------------------------------------------
// Interest row editing and deletion approval
// ---------------------------------------------------------------------------
async function openExistingInterestEditor() {
  const rows = visibleLinkedPropertyRows.value.filter(
    (row) => row.interest_row_name,
  )
  if (!rows.length) {
    toast.info(__('No existing interest record is available to edit.'))
    return
  }
  const labels = rows.map((row) => interestOptionLabel(row))
  const values = await renderFieldLayoutDialog({
    title: __('Select Interest to Edit'),
    fields: [
      {
        fieldname: 'selection',
        fieldtype: 'Select',
        label: __('Interest Record'),
        options: `\n${labels.join('\n')}`,
        reqd: 1,
      },
    ],
    submitLabel: __('Edit'),
  })
  if (!values?.selection) return
  const index = labels.indexOf(values.selection)
  if (index >= 0) await editInterestRecord(rows[index])
}

async function editInterestRecord(row) {
  const values = await renderFieldLayoutDialog({
    title: __('Edit Interest Record'),
    size: 'lg',
    defaults: {
      interest_category: row.interest_category,
      unit: row.interest_record_type === 'Inventory Unit' ? row.name : null,
      request_notes: row.request_notes,
      request_status: row.request_status || 'Open',
      international_type: row.international_type,
      international_country: row.international_country,
      international_details: row.international_details,
      unit_interest_status: row.unit_interest_status || 'Active',
    },
    fields: [
      {
        fieldname: 'interest_category',
        fieldtype: 'Select',
        label: __('Interest Category'),
        options: '\nResale\nPrimary\nBrokerage Request\nInternational',
        reqd: 1,
      },
      {
        fieldname: 'unit',
        fieldtype: 'Link',
        label: __('Available Unit'),
        options: 'Real Estate Unit',
        depends_on: "eval:['Resale','Primary'].includes(doc.interest_category)",
        mandatory_depends_on:
          "eval:['Resale','Primary'].includes(doc.interest_category)",
        get_query: () => ({ filters: { status: 'Available' } }),
      },
      {
        fieldname: 'request_notes',
        fieldtype: 'Small Text',
        label: __('Brokerage Requirements'),
        depends_on: "eval:doc.interest_category=='Brokerage Request'",
        mandatory_depends_on: "eval:doc.interest_category=='Brokerage Request'",
      },
      {
        fieldname: 'request_status',
        fieldtype: 'Select',
        label: __('Request Status'),
        options: '\nOpen\nFulfilled\nCancelled',
        depends_on: "eval:doc.interest_category=='Brokerage Request'",
      },
      {
        fieldname: 'international_type',
        fieldtype: 'Select',
        label: __('International Category'),
        options: '\nStocks\nCharity Work\nReal Estate',
        depends_on: "eval:doc.interest_category=='International'",
        mandatory_depends_on: "eval:doc.interest_category=='International'",
      },
      {
        fieldname: 'international_country',
        fieldtype: 'Link',
        label: __('Country'),
        options: 'Country',
        depends_on: "eval:doc.interest_category=='International'",
        mandatory_depends_on: "eval:doc.interest_category=='International'",
      },
      {
        fieldname: 'international_details',
        fieldtype: 'Small Text',
        label: __('International Details'),
        depends_on: "eval:doc.interest_category=='International'",
      },
      {
        fieldname: 'unit_interest_status',
        fieldtype: 'Select',
        label: __('Interest Status'),
        options: '\nActive\nLost Interest',
        reqd: 1,
      },
    ],
    submitLabel: __('Save Changes'),
  })
  if (!values) return

  try {
    await call('real_estate_crm_customs.api.update_interest_record', {
      lead: props.leadId,
      row_name: row.interest_row_name,
      interest_data: JSON.stringify(values),
    })
    reloadActionWeb()
    toast.success(__('Interest record updated.'))
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Error updating interest record'),
    )
  }
}

async function requestInterestDeletion(row) {
  const values = await renderFieldLayoutDialog({
    title: __('Request Interest Deletion'),
    fields: [
      {
        fieldname: 'reason',
        fieldtype: 'Small Text',
        label: __('Reason for deletion'),
        reqd: 1,
      },
    ],
    submitLabel: __('Send to Manager'),
  })
  if (!values?.reason) return

  try {
    const result = await call(
      'real_estate_crm_customs.api.request_interest_deletion',
      {
        lead: props.leadId,
        row_name: row.interest_row_name,
        reason: values.reason,
      },
    )
    reloadActionWeb()
    toast.success(
      __('Deletion request sent to {0}.', [
        result.allocated_to || __('Sales Manager'),
      ]),
    )
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Error requesting deletion'),
    )
  }
}

async function reviewInterestDeletion(row, decision) {
  const values = await renderFieldLayoutDialog({
    title:
      decision === 'Approve'
        ? __('Approve Interest Deletion')
        : __('Reject Interest Deletion'),
    fields: [
      {
        fieldname: 'note',
        fieldtype: 'Small Text',
        label: __('Manager Note'),
      },
    ],
    submitLabel: __(decision),
  })
  if (!values) return

  try {
    await call('real_estate_crm_customs.api.review_interest_deletion', {
      lead: props.leadId,
      row_name: row.interest_row_name,
      request_name: row.deletion_request || null,
      decision,
      note: values.note || null,
    })
    reloadActionWeb()
    toast.success(
      decision === 'Approve'
        ? __('Interest deleted after manager approval.')
        : __('Deletion request rejected.'),
    )
  } catch (err) {
    toast.error(
      err.messages?.[0] ||
        err.message ||
        __('Error reviewing deletion request'),
    )
  }
}

function interestOptionLabel(row) {
  const title =
    row.sku ||
    row.request_notes ||
    [row.international_type, row.international_country]
      .filter(Boolean)
      .join(' — ') ||
    row.name
  return `${row.interest_category || 'Interest'} — ${title} [${row.interest_row_name}]`
}

function reloadActionWeb() {
  sections.reload()
  document.reload?.()
  linkedProperties.reload()
  interestWorkflow.reload()
  leadProgress.reload()
  smartEvents.value?.reload?.()
  activities.value?.all_activities?.reload?.()
}

function formatDateTime(value) {
  if (!value) return __('—')
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

// ---------------------------------------------------------------------------
// Interest Preferences Edit (standalone)
// ---------------------------------------------------------------------------
async function editBuyerInterestPreferences() {
  if (!isBuyerLead.value) {
    toast.error(__('Only buyer leads can have interest details'))
    return
  }

  let values = await renderFieldLayoutDialog({
    title: __('Edit Interest Details'),
    size: 'xl',
    defaults: {
      area_unit: doc.value.area_unit || 'Sq M',
      preferred_area: doc.value.preferred_area,
      preferred_unit_type: doc.value.preferred_unit_type,
      preferred_developer: doc.value.preferred_developer,
      preferred_compound: doc.value.preferred_compound,
      preferred_finishing_type: doc.value.preferred_finishing_type,
      preferred_delivery_time: doc.value.preferred_delivery_time,
      buyer_budget: doc.value.buyer_budget,
    },
    fields: [
      {
        fieldname: 'preferred_area',
        fieldtype: 'Data',
        label: __('Preferred Location / Area'),
      },
      {
        fieldname: 'area_unit',
        fieldtype: 'Select',
        label: __('Area Unit'),
        options: 'Sq M\nSq Ft',
      },
      {
        fieldname: 'preferred_unit_type',
        fieldtype: 'Select',
        label: __('Unit Type'),
        options:
          '\nApartment\nDuplex\nTownhouse\nVilla\nChalet\nStudio\nPenthouse',
      },
      {
        fieldname: 'preferred_developer',
        fieldtype: 'Link',
        label: __('Developer'),
        options: 'Property Developer',
      },
      {
        fieldname: 'preferred_compound',
        fieldtype: 'Link',
        label: __('Compound / Project'),
        options: 'Real Estate Project',
      },
      {
        fieldname: 'preferred_finishing_type',
        fieldtype: 'Select',
        label: __('Finishing Type'),
        options: '\nCore & Shell\nSemi-Finished\nFully Finished',
      },
      {
        fieldname: 'preferred_delivery_time',
        fieldtype: 'Data',
        label: __('Delivery Time'),
      },
      { fieldname: 'buyer_budget', fieldtype: 'Currency', label: __('Budget') },
    ],
    submitLabel: __('Save Interest Details'),
  })

  if (!values) return

  Object.entries(values).forEach(([fieldname, value]) => {
    doc.value[fieldname] = value
  })

  document.save.submit(null, {
    onSuccess: () => {
      sections.reload()
      toast.success(__('Interest details updated'))
    },
    onError: (err) => {
      toast.error(err.messages?.[0] || __('Error updating interest details'))
      document.reload?.()
    },
  })
}

// ---------------------------------------------------------------------------
// Unit Selection Popup
// ---------------------------------------------------------------------------
function openUnitSelectionPopup() {
  showUnitSelectionDialog.value = true
}

function onUnitsAdded() {
  reloadActionWeb()
  toast.success(__('Selected inventory units added to the buyer interest list'))
}

// ---------------------------------------------------------------------------
// Seller: Create or assign a property unit
// ---------------------------------------------------------------------------
async function addSellerProperty() {
  if (!isSellerLead.value) {
    toast.error(__('Add Property is available only for Seller leads.'))
    return
  }

  const values = await renderFieldLayoutDialog({
    title: __('Add Seller Property'),
    size: 'lg',
    fields: [
      {
        fieldname: 'project',
        fieldtype: 'Link',
        label: __('Project'),
        options: 'Real Estate Project',
        reqd: 1,
      },
      {
        fieldname: 'unit_number',
        fieldtype: 'Data',
        label: __('Unit Number'),
        reqd: 1,
      },
      {
        fieldname: 'price',
        fieldtype: 'Currency',
        label: __('Target Asking Price'),
      },
    ],
    submitLabel: __('Create Property'),
  })
  if (!values?.project || !values?.unit_number) return

  try {
    await call('real_estate_crm_customs.api.create_resale_unit', {
      owner_lead: props.leadId,
      project: values.project,
      unit_number: values.unit_number,
      price: values.price || null,
    })
    reloadActionWeb()
    toast.success(__('Seller property created and linked to this lead.'))
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Error creating seller property'),
    )
  }
}

async function assignPropertyUnitToSeller() {
  if (doc.value.party_type !== 'Seller') {
    toast.error(__('Only seller leads can be assigned property units'))
    return
  }

  let values = await renderFieldLayoutDialog({
    title: __('Assign Property Unit'),
    fields: [
      {
        fieldname: 'unit',
        fieldtype: 'Link',
        label: __('Available Unit'),
        options: 'Real Estate Unit',
        reqd: 1,
        get_query: () => ({ filters: { status: 'Available' } }),
      },
    ],
  })

  if (!values?.unit) return

  await call('real_estate_crm_customs.api.assign_property_unit_to_seller', {
    lead: props.leadId,
    unit: values.unit,
  })
  reloadActionWeb()
  toast.success(__('Property unit assigned to this seller lead'))
}

// ---------------------------------------------------------------------------
// Generic Field Update & Status
// ---------------------------------------------------------------------------
function updateField(name, value) {
  value = Array.isArray(name) ? '' : value
  let oldValues = Array.isArray(name) ? {} : doc.value[name]

  if (Array.isArray(name)) {
    name.forEach((field) => (doc.value[field] = value))
  } else {
    doc.value[name] = value
  }

  document.save.submit(null, {
    onSuccess: () => (reload.value = true),
    onError: (err) => {
      if (Array.isArray(name)) {
        name.forEach((field) => (doc.value[field] = oldValues[field]))
      } else {
        doc.value[name] = oldValues
      }
      toast.error(err.messages?.[0] || __('Error updating field'))
    },
  })
}

function deleteLead() {
  showDeleteLinkedDocModal.value = true
}

function statusLabel(status) {
  if (isTranslatable('CRM Lead Status')) return __(status)
  return status
}

const showLostReasonModal = ref(false)

function setLostReason() {
  if (
    getLeadStatus(document.doc.status).type !== 'Lost' ||
    (document.doc.lost_reason && document.doc.lost_reason !== 'Other') ||
    (document.doc.lost_reason === 'Other' && document.doc.lost_notes)
  ) {
    document.save.submit(null, {
      onSuccess: () => sections.reload(),
    })
    return
  }

  showLostReasonModal.value = true
}

function beforeStatusChange(data) {
  if (
    Object.hasOwn(data ?? {}, 'status') &&
    getLeadStatus(data.status).type == 'Lost'
  ) {
    setLostReason()
  } else {
    document.save.submit(null, {
      onSuccess: () => reloadResources(data),
    })
  }
}

function reloadResources(data) {
  if (Object.hasOwn(data ?? {}, 'lead_owner')) {
    assignees.reload()
  }
  if (
    Object.hasOwn(data ?? {}, 'status') &&
    getLeadStatus(data.status).type != 'Lost'
  ) {
    sections.reload()
  }
}
</script>
