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
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div
                  v-if="doc.lead_age"
                  class="rounded bg-surface-gray-2 px-3 py-1.5 text-xs font-medium text-ink-gray-7"
                >
                  {{ __('Lead Age') }}: {{ doc.lead_age }}
                </div>
                <Button
                  :label="__('WhatsApp Message')"
                  variant="subtle"
                  @click="openWhatsAppWithSubject"
                />
              </div>
              <LeadActionWeb
                :context="actionContext.data || {}"
                :loading="actionContext.loading"
                @execute-action="executeDynamicAction"
                @complete-action="openCallLogDialog"
                @plan-action="openNextActionDialog"
                @cancel-action="cancelDynamicAction"
              />

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
                      @click="openInterestWorkflow"
                    />
                    <Button
                      :label="__('Browse Units')"
                      variant="subtle"
                      @click="openInterestWorkflow"
                    />
                    <Button
                      :label="__('Edit Existing')"
                      variant="subtle"
                      @click="openInterestWorkflow"
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
  <UnitSelectionDialog
    v-model="showInterestUnitPicker"
    :lead-id="leadId"
    :interest-category="interestUnitCategory"
    :include-unit="interestUnitCurrent"
    :initial-criteria="interestUnitCriteria"
    :selection-mode="interestUnitSelectionMode"
    @selected="resolveInterestUnitSelection"
    @cancelled="cancelInterestUnitSelection"
  />
  <LostReasonModal
    v-if="showLostReasonModal"
    v-model="showLostReasonModal"
    doctype="CRM Lead"
    :document="document"
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
import LeadActionWeb from '@/components/LeadActionWeb.vue'
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
const showInterestUnitPicker = ref(false)
const interestUnitCategory = ref('Resale')
const interestUnitCurrent = ref('')
const interestUnitCriteria = ref({})
const interestUnitSelectionMode = ref('multiple')
const interestUnitResolver = ref(null)

const { triggerOnRender, assignees, permissions, document, scripts, error } =
  useDocument('CRM Lead', props.leadId)

const canDelete = computed(() => permissions.data?.permissions?.delete || false)

const doc = computed(() => document.doc || {})
const isBuyerLead = computed(() => doc.value.party_type !== 'Seller')
const isSellerLead = computed(() => doc.value.party_type === 'Seller')

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

const actionContext = createResource({
  url: 'real_estate_crm_customs.api.get_lead_action_context',
  cache: ['leadActionContext', props.leadId],
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
async function triggerLeadCall() {
  const currentAction = actionContext.data?.current_action
  if (!currentAction) {
    const callDefinition = (actionContext.data?.allowed_actions || []).find(
      (definition) => definition.action_type === 'Call',
    )
    if (callDefinition) {
      await openNextActionDialog(callDefinition, { forceImmediate: true })
      return
    }
  }
  if (!currentAction || currentAction.action_type !== 'Call') {
    toast.info(__('Complete the current required action before calling.'))
    return
  }
  if (['Planned', 'Due'].includes(currentAction.workflow_status)) {
    await executeDynamicAction(currentAction)
    return
  }
  executePhoneCall()
}

function executePhoneCall() {
  const number = doc.value.mobile_no || doc.value.whatsapp_number
  if (!number) {
    toast.error(__('Please set a mobile number for this lead'))
    return
  }
  // Phone fieldtype stores as +CC-XXXXXXXXXX (e.g. +20-1070009839)
  // For tel: URI, replace hyphen with nothing to get +CCXXXXXXXXXX
  const fullPhone = number.replace(/-/g, '')
  if (callEnabled.value) {
    makeCall(fullPhone)
    return
  }
  window.open(`tel:${fullPhone}`, '_self')
}

// ---------------------------------------------------------------------------
// 3. Dynamic Action Web — each result closes only its current action
// ---------------------------------------------------------------------------
async function startDynamicAction(action) {
  try {
    const result = await call('real_estate_crm_customs.api.start_lead_action', {
      lead: props.leadId,
      action_name: action.name,
    })
    if (action.action_type === 'Call') executePhoneCall()
    reloadActionWeb()
    if (action.action_type !== 'Call') {
      toast.success(__('Action is ready. Record its result now.'))
    }
    return result?.action || action
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Could not start action'),
    )
    return null
  }
}

async function executeDynamicAction(action) {
  const activeAction = ['Planned', 'Due'].includes(action.workflow_status)
    ? await startDynamicAction(action)
    : action
  if (!activeAction) return
  if (activeAction.action_type === 'Call') {
    if (action.workflow_status === 'In Progress') executePhoneCall()
    return
  }
  await openCallLogDialog(activeAction)
}

async function continueImmediateSuccessor(successor, nextAction) {
  if (!successor || !nextAction?.execute_now) return
  await executeDynamicAction(successor)
}

async function cancelDynamicAction(action) {
  const values = await renderFieldLayoutDialog({
    title: __('Cancel Current Action'),
    fields: [
      {
        fieldname: 'reason',
        fieldtype: 'Small Text',
        label: __('Cancellation reason'),
        reqd: 1,
      },
    ],
    submitLabel: __('Cancel Action'),
  })
  if (!values?.reason) return

  const nextAction = actionNeedsNextAction(action, { outcome: 'Cancelled' })
    ? await collectNextAction(action, { outcome: 'Cancelled' })
    : null
  if (actionNeedsNextAction(action, { outcome: 'Cancelled' }) && !nextAction)
    return

  try {
    const result = await call(
      'real_estate_crm_customs.api.cancel_lead_action',
      {
        lead: props.leadId,
        action_name: action.name,
        reason: values.reason,
        next_action: nextAction ? JSON.stringify(nextAction) : null,
      },
    )
    reloadActionWeb()
    toast.success(
      __('Action cancelled and the required follow-up was preserved.'),
    )
    await continueImmediateSuccessor(result?.successor_action, nextAction)
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Could not cancel action'),
    )
  }
}

async function openCallLogDialog(action = null) {
  const currentAction = action || actionContext.data?.current_action
  if (!currentAction) {
    toast.info(__('There is no current workflow action to complete.'))
    return
  }

  if (currentAction.action_type === 'Add Interest') {
    await completeInterestAction(currentAction)
    return
  }

  const rawValues = await collectActionResult(currentAction)
  if (!rawValues) return
  const values = normalizeActionResult(currentAction, rawValues)

  if (actionNeedsNextAction(currentAction, values)) {
    const nextAction = await collectNextAction(currentAction, values)
    if (!nextAction) return
    values.next_action = nextAction
  }

  const dispatchWindow =
    currentAction.action_type === 'Send Offer'
      ? window.open('about:blank', '_blank')
      : null
  try {
    const result = await call(
      'real_estate_crm_customs.api.complete_lead_action',
      {
        lead: props.leadId,
        action_name: currentAction.name,
        result_data: JSON.stringify(values),
        client_request_id: createClientRequestId(),
        expected_modified: currentAction.modified,
      },
    )
    updateLeadActionState(result)
    reloadActionWeb()
    if (result?.dispatch?.whatsapp_url) {
      if (dispatchWindow)
        dispatchWindow.location.href = result.dispatch.whatsapp_url
      else window.location.assign(result.dispatch.whatsapp_url)
      toast.success(
        __(
          'Offer recorded and WhatsApp opened with the selected unit details.',
        ),
      )
    } else {
      toast.success(
        __('Action result saved. The lead workflow has been recalculated.'),
      )
    }
    await continueImmediateSuccessor(
      result?.successor_action,
      values.next_action,
    )
  } catch (err) {
    dispatchWindow?.close()
    toast.error(
      err.messages?.[0] || err.message || __('Could not save action result'),
    )
  }
}

function actionNeedsNextAction(action, values) {
  if (values.outcome === 'Rescheduled') return false
  if (
    action.action_type === 'Call' &&
    action.purpose === 'Initial Qualification'
  ) {
    return (
      values.contact_result !== 'Answered' ||
      values.qualification === 'Interested'
    )
  }
  return actionContext.data?.qualification === 'Interested'
}

function createClientRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `lead-action-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

async function collectActionResult(action) {
  const fields = actionResultFields(action)
  const values = await renderFieldLayoutDialog({
    title: __('Complete {0}', [action.action_type]),
    size: 'lg',
    fields,
    submitLabel: __('Save Result'),
  })
  return values || null
}

function actionResultFields(action) {
  if (action.action_type === 'Call') {
    const fields = [
      {
        fieldname: 'contact_result',
        fieldtype: 'Select',
        label: __('Contact Result'),
        options: '\nAnswered\nNo Answer\nWrong Number\nInvalid / Disconnected',
        reqd: 1,
      },
    ]
    if (action.purpose === 'Initial Qualification') {
      fields.push(
        {
          fieldname: 'qualification',
          fieldtype: 'Select',
          label: __('Qualification Outcome'),
          options: '\nInterested\nNot Interested',
          depends_on: "eval:doc.contact_result=='Answered'",
          mandatory_depends_on: "eval:doc.contact_result=='Answered'",
        },
        {
          fieldname: 'closed_reason',
          fieldtype: 'Small Text',
          label: __('Reason for Not Interested'),
          depends_on: "eval:doc.qualification=='Not Interested'",
          mandatory_depends_on: "eval:doc.qualification=='Not Interested'",
        },
      )
    } else if (action.purpose === 'Offer Follow-up') {
      fields.push(
        {
          fieldname: 'outcome',
          fieldtype: 'Select',
          label: __('Offer Follow-up Outcome'),
          options: '\nViewed\nOffer Accepted\nRejected\nNeeds Alternatives',
          depends_on: "eval:doc.contact_result=='Answered'",
          mandatory_depends_on: "eval:doc.contact_result=='Answered'",
        },
        ...interestSelectionFields(action, {
          label: __('Offer interest record'),
          requiredFor: ['Viewed', 'Offer Accepted', 'Rejected'],
        }),
      )
    } else if (action.purpose === 'Negotiation Follow-up') {
      fields.push(
        {
          fieldname: 'outcome',
          fieldtype: 'Select',
          label: __('Negotiation Outcome'),
          options: '\nContinuing\nTerms Changed\nAccepted\nDeclined',
          reqd: 1,
        },
        ...interestSelectionFields(action, {
          label: __('Negotiating interest record'),
        }),
      )
    } else {
      fields.push({
        fieldname: 'outcome',
        fieldtype: 'Select',
        label: __('Follow-up Outcome'),
        options: '\nCompleted\nNeeds Callback\nConfirmed\nCancelled',
        reqd: 1,
      })
    }
    fields.push({
      fieldname: 'result_note',
      fieldtype: 'Small Text',
      label: __('Result Note'),
    })
    return fields
  }

  if (action.action_type === 'Meeting') {
    return [
      {
        fieldname: 'outcome',
        fieldtype: 'Select',
        label: __('Meeting Outcome'),
        options: '\nDone\nNo Show\nCancelled\nRescheduled',
        reqd: 1,
      },
      {
        fieldname: 'result_note',
        fieldtype: 'Small Text',
        label: __('Meeting Result Note'),
        depends_on: "eval:doc.outcome=='Done'",
        mandatory_depends_on: "eval:doc.outcome=='Done'",
      },
      {
        fieldname: 'closed_reason',
        fieldtype: 'Small Text',
        label: __('No Show / Cancellation Reason'),
        depends_on: "eval:['No Show','Cancelled'].includes(doc.outcome)",
        mandatory_depends_on:
          "eval:['No Show','Cancelled'].includes(doc.outcome)",
      },
      {
        fieldname: 'reschedule_to',
        fieldtype: 'Datetime',
        label: __('Reschedule To'),
        depends_on: "eval:doc.outcome=='Rescheduled'",
        mandatory_depends_on: "eval:doc.outcome=='Rescheduled'",
      },
    ]
  }

  if (action.action_type === 'Showing') {
    return [
      {
        fieldname: 'outcome',
        fieldtype: 'Select',
        label: __('Showing Outcome'),
        options:
          '\nCompleted\nBuyer No Show\nSeller/Unit Unavailable\nCancelled\nRescheduled',
        reqd: 1,
      },
      {
        fieldname: 'unit_outcome',
        fieldtype: 'Select',
        label: __('Unit Outcome'),
        options: '\nInterested\nConsidering\nRejected\nNo Feedback',
        depends_on: "eval:doc.outcome=='Completed'",
        mandatory_depends_on: "eval:doc.outcome=='Completed'",
      },
      {
        fieldname: 'result_note',
        fieldtype: 'Small Text',
        label: __('Showing Note'),
      },
      {
        fieldname: 'closed_reason',
        fieldtype: 'Small Text',
        label: __('Reason'),
        depends_on:
          "eval:['Buyer No Show','Seller/Unit Unavailable','Cancelled'].includes(doc.outcome)",
        mandatory_depends_on:
          "eval:['Buyer No Show','Seller/Unit Unavailable','Cancelled'].includes(doc.outcome)",
      },
      {
        fieldname: 'reschedule_to',
        fieldtype: 'Datetime',
        label: __('Reschedule To'),
        depends_on: "eval:doc.outcome=='Rescheduled'",
        mandatory_depends_on: "eval:doc.outcome=='Rescheduled'",
      },
    ]
  }

  if (action.action_type === 'Send Offer') {
    return [
      {
        fieldname: 'result_note',
        fieldtype: 'Small Text',
        label: __('WhatsApp Offer Message'),
        description: __(
          'The selected units, prices, projects and locations will be appended automatically.',
        ),
        reqd: 1,
      },
    ]
  }

  return [
    {
      fieldname: 'outcome',
      fieldtype: 'Select',
      label: __('Negotiation Outcome'),
      options: '\nContinuing\nTerms Changed\nAccepted\nDeclined',
      reqd: 1,
    },
    ...interestSelectionFields(action, {
      label: __('Negotiating interest record'),
    }),
    {
      fieldname: 'result_note',
      fieldtype: 'Small Text',
      label: __('Result Note'),
    },
  ]
}

function scopedInterestRows(action) {
  const contextRows = actionContext.data?.interest_rows || []
  const scopedNames = action?.interest_rows || []
  if (!scopedNames.length) return contextRows
  return contextRows.filter((row) => scopedNames.includes(row.name))
}

function interestSelectionFields(action, { label, requiredFor = null }) {
  const rows = scopedInterestRows(action)
  const outcomeExpression = requiredFor
    ? `eval:${JSON.stringify(requiredFor)}.includes(doc.outcome)`
    : null
  return rows.map((row, index) => ({
    fieldname: `interest_row_${index}`,
    fieldtype: 'Check',
    label: `${label}: ${row.label}`,
    default: rows.length === 1 ? 1 : 0,
    depends_on: outcomeExpression || undefined,
  }))
}

function normalizeActionResult(action, values) {
  const result = { ...values }
  if (action.action_type === 'Send Offer') result.outcome = 'Dispatched'
  const rows = scopedInterestRows(action)
  const selectedRows = rows
    .filter((_row, index) => Boolean(values[`interest_row_${index}`]))
    .map((row) => row.name)
  Object.keys(result)
    .filter((fieldname) => fieldname.startsWith('interest_row_'))
    .forEach((fieldname) => delete result[fieldname])
  if (selectedRows.length) result.interest_rows = selectedRows
  return result
}

async function collectNextAction(action, values) {
  const definitions = nextActionDefinitions(action, values)
  if (!definitions.length) {
    toast.error(
      __('No next action is permitted in the current workflow context.'),
    )
    return null
  }

  const options = definitions.map(actionOptionLabel)
  const selector = await renderFieldLayoutDialog({
    title: __('Required Next Action'),
    fields: [
      {
        fieldname: 'selection',
        fieldtype: 'Select',
        label: __('Choose the next action'),
        options: `\n${options.join('\n')}`,
        reqd: 1,
      },
    ],
    submitLabel: __('Continue'),
  })
  if (!selector?.selection) return null
  const definition = definitions[options.indexOf(selector.selection)]
  return collectActionPlan(definition, action, values)
}

function nextActionDefinitions(action, values) {
  if (
    action.action_type === 'Call' &&
    action.purpose === 'Initial Qualification' &&
    values.contact_result === 'Answered' &&
    values.qualification === 'Interested'
  ) {
    return derivePolicyActions(simulateInterestFacts(action, values))
  }
  if (
    values.qualification === 'Interested' ||
    actionContext.data?.qualification === 'Interested'
  ) {
    return derivePolicyActions(simulateInterestFacts(action, values))
  }
  return actionContext.data?.allowed_next_actions || []
}

function simulateInterestFacts(action, values) {
  const selected = new Set(values.interest_rows || action.interest_rows || [])
  return (actionContext.data?.interest_rows || [])
    .map((row) => {
      const simulated = { ...row }
      if (!selected.has(row.name)) return simulated

      if (
        action.action_type === 'Send Offer' &&
        values.outcome === 'Dispatched'
      ) {
        simulated.offer_sent = 1
        simulated.proposal_status = 'Sent'
      }
      if (
        action.action_type === 'Call' &&
        action.purpose === 'Offer Follow-up'
      ) {
        if (values.outcome === 'Offer Accepted')
          simulated.proposal_status = 'Offer Accepted'
        if (values.outcome === 'Rejected') simulated.rejected = true
      }
      if (action.action_type === 'Showing' && values.outcome === 'Completed') {
        if (values.unit_outcome === 'Interested')
          simulated.proposal_status = 'Offer Accepted'
        if (values.unit_outcome === 'Rejected') simulated.rejected = true
      }
      if (action.action_type === 'Negotiation Follow-up') {
        if (values.outcome === 'Declined') simulated.rejected = true
        else simulated.proposal_status = 'Offer Accepted'
      }
      return simulated
    })
    .filter((row) => !row.rejected)
}

function derivePolicyActions(rows) {
  const inventoryRows = rows.filter((row) => row.unit)
  const unsentRows = inventoryRows.filter((row) => !row.offer_sent)
  const sentRows = inventoryRows.filter(
    (row) => row.offer_sent && row.proposal_status !== 'Rejected',
  )
  const negotiatingRows = sentRows.filter(
    (row) => row.proposal_status === 'Offer Accepted',
  )
  const definitions = [
    {
      action_type: 'Add Interest',
      purpose: 'Requirements Discovery',
      label: __('Add or update buyer interest'),
      requires_interest_rows: false,
      requires_unit: false,
    },
    {
      action_type: 'Call',
      purpose: 'General Follow-up',
      label: __('Follow up by call'),
      requires_interest_rows: false,
      requires_unit: false,
    },
    {
      action_type: 'Meeting',
      purpose: 'Discovery Meeting',
      label: __('Hold or schedule a discovery meeting'),
      requires_interest_rows: false,
      requires_unit: false,
    },
  ]
  if (unsentRows.length) {
    definitions.push({
      action_type: 'Send Offer',
      purpose: 'Offer Follow-up',
      label: __('Send selected unit offers by WhatsApp'),
      requires_interest_rows: true,
      requires_unit: false,
      interest_row_names: unsentRows.map((row) => row.name),
    })
  }
  if (sentRows.length) {
    definitions.push({
      action_type: 'Call',
      purpose: 'Offer Follow-up',
      label: __('Follow up on sent offers'),
      requires_interest_rows: true,
      requires_unit: false,
      interest_row_names: sentRows.map((row) => row.name),
    })
  }
  if (negotiatingRows.length) {
    const rowNames = negotiatingRows.map((row) => row.name)
    definitions.push(
      {
        action_type: 'Negotiation Follow-up',
        purpose: 'Negotiation Follow-up',
        label: __('Record negotiation follow-up'),
        requires_interest_rows: true,
        requires_unit: false,
        interest_row_names: rowNames,
      },
      {
        action_type: 'Showing',
        purpose: 'Showing Confirmation',
        label: __('Hold or schedule a unit showing'),
        requires_interest_rows: true,
        requires_unit: true,
        interest_row_names: rowNames,
      },
    )
  }
  return definitions
}

function actionOptionLabel(definition) {
  return `${definition.action_type} — ${definition.purpose}`
}

async function collectActionPlan(definition, { forceImmediate = false } = {}) {
  const alwaysImmediate = definition.action_type === 'Add Interest'
  const requiresRows =
    definition.requires_interest_rows || definition.action_type === 'Showing'
  const planScope = definition.interest_row_names?.length
    ? { interest_rows: definition.interest_row_names }
    : null
  const planRows = scopedInterestRows(planScope)
  const fields = []

  if (!alwaysImmediate && !forceImmediate) {
    fields.push(
      {
        fieldname: 'execution_timing',
        fieldtype: 'Select',
        label: __('When should this action happen?'),
        options: '\nDo Now\nSchedule for Later',
        default: 'Do Now',
        reqd: 1,
      },
      {
        fieldname: 'scheduled_start',
        fieldtype: 'Datetime',
        label: __('Scheduled Date & Time'),
        depends_on: "eval:doc.execution_timing=='Schedule for Later'",
        mandatory_depends_on: "eval:doc.execution_timing=='Schedule for Later'",
      },
    )
  }
  if (definition.action_type === 'Showing') {
    fields.push({
      fieldname: 'showing_interest_selection',
      fieldtype: 'Select',
      label: __('Showing Unit Interest'),
      options: `\n${planRows.map((row) => row.label).join('\n')}`,
      reqd: 1,
    })
  } else if (definition.requires_unit) {
    fields.push({
      fieldname: 'unit',
      fieldtype: 'Link',
      label: __('Related Unit'),
      options: 'Real Estate Unit',
      reqd: 1,
    })
  }
  if (requiresRows && definition.action_type !== 'Showing') {
    fields.push(
      ...interestSelectionFields(planScope, {
        label: __('Scope interest record'),
      }),
    )
  }
  fields.push({
    fieldname: 'notes',
    fieldtype: 'Small Text',
    label: __('Planning Notes'),
  })

  const values = await renderFieldLayoutDialog({
    title: definition.label || __('Next Action'),
    size: 'lg',
    defaults: {
      execution_timing: 'Do Now',
    },
    fields,
    submitLabel:
      forceImmediate || alwaysImmediate ? __('Do Now') : __('Continue'),
  })
  if (!values) return null

  const normalized = normalizeActionResult(planScope, values)
  const executeNow =
    forceImmediate ||
    alwaysImmediate ||
    normalized.execution_timing !== 'Schedule for Later'
  delete normalized.execution_timing
  if (definition.action_type === 'Showing') {
    const selectedRow = planRows.find(
      (row) => row.label === normalized.showing_interest_selection,
    )
    delete normalized.showing_interest_selection
    if (!selectedRow?.unit) {
      toast.error(__('Select one inventory-unit interest for the showing.'))
      return null
    }
    normalized.interest_rows = [selectedRow.name]
    normalized.unit = selectedRow.unit
  }
  if (requiresRows && !normalized.interest_rows?.length) {
    toast.error(__('Select at least one scoped interest record.'))
    return null
  }
  return {
    action_type: definition.action_type,
    purpose: definition.purpose,
    scheduled_start: executeNow
      ? frappeNowDateTime()
      : normalized.scheduled_start,
    execute_now: executeNow,
    unit: normalized.unit || null,
    interest_rows: normalized.interest_rows || [],
    notes: normalized.notes || null,
  }
}

function frappeNowDateTime() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

async function openInterestWorkflow() {
  const action = actionContext.data?.current_action
  if (action?.action_type === 'Add Interest') {
    const currentAction = ['Planned', 'Due'].includes(action.workflow_status)
      ? await startDynamicAction(action)
      : action
    if (!currentAction) return
    await completeInterestAction(currentAction)
    return
  }
  if (action) {
    toast.info(
      __(
        'Complete, reschedule, or cancel the current action before changing buyer interests.',
      ),
    )
    return
  }
  const definition = (actionContext.data?.allowed_actions || []).find(
    (item) => item.action_type === 'Add Interest',
  )
  if (!definition) {
    toast.info(
      __('An interest action is not available for this lead at the moment.'),
    )
    return
  }
  await openNextActionDialog(definition)
}

async function completeInterestAction(action) {
  const result = await openInterestDeterminationDialog()
  if (!result) return
  await actionContext.reload()
  const values = { outcome: result }
  const nextAction = await collectNextAction(action, values)
  if (!nextAction) return
  values.next_action = nextAction
  try {
    const completion = await call(
      'real_estate_crm_customs.api.complete_lead_action',
      {
        lead: props.leadId,
        action_name: action.name,
        result_data: JSON.stringify(values),
        client_request_id: createClientRequestId(),
        expected_modified: action.modified,
      },
    )
    reloadActionWeb()
    toast.success(__('Interest action completed and next action created.'))
    await continueImmediateSuccessor(completion?.successor_action, nextAction)
  } catch (err) {
    toast.error(
      err.messages?.[0] ||
        err.message ||
        __('Could not complete interest action'),
    )
  }
}

// ---------------------------------------------------------------------------
// 4. Interest Determination Dialog
// ---------------------------------------------------------------------------
function selectInterestUnits(
  category,
  { currentUnit = '', criteria = {}, multiple = true } = {},
) {
  if (interestUnitResolver.value) interestUnitResolver.value(null)
  interestUnitCategory.value = category
  interestUnitCurrent.value = currentUnit || ''
  interestUnitCriteria.value = criteria || {}
  interestUnitSelectionMode.value = multiple ? 'multiple' : 'single'
  showInterestUnitPicker.value = true
  return new Promise((resolve) => {
    interestUnitResolver.value = resolve
  })
}

function resolveInterestUnitSelection(unit) {
  const resolve = interestUnitResolver.value
  interestUnitResolver.value = null
  if (resolve) resolve(unit || null)
}

function cancelInterestUnitSelection() {
  const resolve = interestUnitResolver.value
  interestUnitResolver.value = null
  if (resolve) resolve(null)
}

async function chooseInterestCategory(defaults = {}) {
  return renderFieldLayoutDialog({
    title: defaults.editing ? __('Edit Interest') : __('Add Interest'),
    defaults: {
      interest_category: defaults.interest_category || '',
      unit_interest_status: defaults.unit_interest_status || 'Active',
    },
    fields: [
      {
        fieldname: 'interest_category',
        fieldtype: 'Select',
        label: __('Interest Category'),
        options: '\nResale\nPrimary\nBrokerage Request\nInternational',
        reqd: 1,
      },
      ...(defaults.editing
        ? [
            {
              fieldname: 'unit_interest_status',
              fieldtype: 'Select',
              label: __('Interest Status'),
              options: '\nActive\nLost Interest',
              reqd: 1,
            },
          ]
        : []),
    ],
    submitLabel: __('Continue'),
  })
}

function requestInterestFields(category, { editing = false } = {}) {
  const requestFields = [
    {
      fieldname: 'preferred_area',
      fieldtype: 'Data',
      label: __('Preferred Location / Area'),
    },
    {
      fieldname: 'preferred_unit_type',
      fieldtype: 'Select',
      label: __('Preferred Unit Type'),
      options:
        '\nApartment\nDuplex\nTownhouse\nVilla\nChalet\nStudio\nPenthouse',
    },
    {
      fieldname: 'buyer_budget',
      fieldtype: 'Currency',
      label: __('Maximum Budget'),
    },
  ]
  if (category === 'Brokerage Request') {
    return [
      {
        fieldname: 'request_notes',
        fieldtype: 'Small Text',
        label: __('Brokerage Requirements'),
        reqd: 1,
      },
      ...(editing
        ? [
            {
              fieldname: 'request_status',
              fieldtype: 'Select',
              label: __('Request Status'),
              options: '\nOpen\nFulfilled\nCancelled',
              reqd: 1,
            },
          ]
        : []),
      ...requestFields,
    ]
  }
  return [
    {
      fieldname: 'international_type',
      fieldtype: 'Select',
      label: __('International Category'),
      options: '\nStocks\nCharity Work\nReal Estate',
      reqd: 1,
    },
    {
      fieldname: 'international_country',
      fieldtype: 'Link',
      label: __('Country'),
      options: 'Country',
      reqd: 1,
    },
    {
      fieldname: 'international_details',
      fieldtype: 'Small Text',
      label: __('International Request Details'),
    },
    ...requestFields.map((field) => ({
      ...field,
      depends_on: "eval:doc.international_type=='Real Estate'",
    })),
  ]
}

async function loadInterestRequirementOptions(category) {
  try {
    return (
      (await call(
        'real_estate_crm_customs.api.get_property_match_filter_options',
        { interest_category: category },
      )) || {}
    )
  } catch {
    return {}
  }
}

async function collectInventoryInterestRequirements(category, defaults = {}) {
  const options = await loadInterestRequirementOptions(category)
  const locationOptions = Array.from(
    new Set(
      [
        defaults.preferred_area || doc.value.preferred_area,
        ...(options.locations || []),
      ].filter(Boolean),
    ),
  )
  const unitTypeOptions = Array.from(
    new Set(
      [
        defaults.preferred_unit_type || doc.value.preferred_unit_type,
        ...(options.unit_types?.length
          ? options.unit_types
          : ['Apartment', 'Duplex', 'Villa', 'Chalet', 'Penthouse']),
      ].filter(Boolean),
    ),
  )
  const finishingOptions = Array.from(
    new Set(
      [
        defaults.preferred_finishing_type || doc.value.preferred_finishing_type,
        ...(options.finishing_types?.length
          ? options.finishing_types
          : [
              'Core & Shell',
              'Semi-Finished',
              'Fully Finished',
              'Ultra Super Lux',
            ]),
      ].filter(Boolean),
    ),
  )

  return renderFieldLayoutDialog({
    title: __('Buyer Requirements — {0}', [category]),
    size: 'lg',
    defaults: {
      preferred_area: defaults.preferred_area || doc.value.preferred_area,
      preferred_unit_type:
        defaults.preferred_unit_type || doc.value.preferred_unit_type,
      preferred_developer:
        defaults.preferred_developer || doc.value.preferred_developer,
      preferred_compound:
        defaults.preferred_compound || doc.value.preferred_compound,
      preferred_finishing_type:
        defaults.preferred_finishing_type || doc.value.preferred_finishing_type,
      preferred_delivery_time:
        defaults.preferred_delivery_time || doc.value.preferred_delivery_time,
      buyer_budget: defaults.buyer_budget || doc.value.buyer_budget,
    },
    fields: [
      {
        fieldname: 'preferred_area',
        fieldtype: locationOptions.length ? 'Select' : 'Data',
        label: __('Preferred Location / Area'),
        options: locationOptions.length
          ? `\n${locationOptions.join('\n')}`
          : null,
        reqd: 1,
      },
      {
        fieldname: 'preferred_unit_type',
        fieldtype: 'Select',
        label: __('Preferred Unit Type'),
        options: `\n${unitTypeOptions.join('\n')}`,
        reqd: 1,
      },
      {
        fieldname: 'buyer_budget',
        fieldtype: 'Currency',
        label: __('Maximum Budget'),
        reqd: 1,
      },
      {
        fieldname: 'preferred_compound',
        fieldtype: 'Link',
        label: __('Preferred Project'),
        options: 'Real Estate Project',
      },
      {
        fieldname: 'preferred_developer',
        fieldtype: 'Link',
        label: __('Preferred Developer'),
        options: 'Property Developer',
      },
      {
        fieldname: 'preferred_finishing_type',
        fieldtype: 'Select',
        label: __('Preferred Finishing'),
        options: `\n${finishingOptions.join('\n')}`,
      },
      {
        fieldname: 'preferred_delivery_time',
        fieldtype: 'Data',
        label: __('Preferred Delivery Time'),
      },
    ],
    submitLabel: __('Find Matching Units'),
  })
}

async function collectRequestInterest(
  category,
  defaults = {},
  { editing = false } = {},
) {
  return renderFieldLayoutDialog({
    title:
      category === 'International'
        ? __('International Request')
        : __('Brokerage Request'),
    size: 'lg',
    defaults,
    fields: requestInterestFields(category, { editing }),
    submitLabel: __('Save Interest'),
  })
}

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
    if (!choice?.action) return null
    if (choice.action === 'Edit Existing Interest') {
      return (await openExistingInterestEditor()) ? 'Updated' : null
    }
  }

  const categoryValues = await chooseInterestCategory()
  const category = categoryValues?.interest_category
  if (!category) return null

  let interestValues
  if (['Resale', 'Primary'].includes(category)) {
    const requirements = await collectInventoryInterestRequirements(category)
    if (!requirements) return null
    const selectedUnits = await selectInterestUnits(category, {
      criteria: requirements,
      multiple: true,
    })
    if (!selectedUnits?.length) return null
    interestValues = {
      ...requirements,
      units: selectedUnits.map((unit) => unit.name),
    }
  } else {
    interestValues = await collectRequestInterest(category)
    if (!interestValues) return null
  }

  try {
    const interestData = {
      interest_category: category,
      units: interestValues.units || [],
      request_notes: interestValues.request_notes || null,
      international_type: interestValues.international_type || null,
      international_country: interestValues.international_country || null,
      international_details: interestValues.international_details || null,
      preferred_area: interestValues.preferred_area || null,
      preferred_unit_type: interestValues.preferred_unit_type || null,
      preferred_developer: interestValues.preferred_developer || null,
      preferred_compound: interestValues.preferred_compound || null,
      preferred_finishing_type: interestValues.preferred_finishing_type || null,
      preferred_delivery_time: interestValues.preferred_delivery_time || null,
      buyer_budget: interestValues.buyer_budget || null,
    }
    const result = await call(
      'real_estate_crm_customs.api.record_interest_determination',
      {
        lead: props.leadId,
        interested: 1,
        is_primary_buyer: category === 'Primary' ? 1 : 0,
        interest_data: JSON.stringify(interestData),
      },
    )
    updateLeadActionState(result)
    reloadActionWeb()
    toast.success(
      ['Resale', 'Primary'].includes(category)
        ? __('Selected properties added to the lead interests.')
        : __('Interest request added successfully.'),
    )
    return 'Added'
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Error recording interest'),
    )
    return null
  }
}

// ---------------------------------------------------------------------------
// 5. Dynamic planning — only policy-approved actions can be created
// ---------------------------------------------------------------------------
async function openNextActionDialog(
  definition = null,
  { forceImmediate = false } = {},
) {
  const contextDefinition =
    definition && typeof definition === 'object' ? definition : null
  const definitions = actionContext.data?.allowed_actions || []
  const selectedDefinition = contextDefinition || definitions[0]
  if (!selectedDefinition) {
    toast.info(
      __('Complete, reschedule, or cancel the current required action first.'),
    )
    return
  }

  const actionPlan = await collectActionPlan(selectedDefinition, {
    forceImmediate,
  })
  if (!actionPlan) return

  try {
    const result = await call('real_estate_crm_customs.api.plan_lead_action', {
      lead: props.leadId,
      action_type: actionPlan.action_type,
      purpose: actionPlan.purpose,
      scheduled_start: actionPlan.scheduled_start,
      notes: actionPlan.notes,
      unit: actionPlan.unit,
      interest_rows: JSON.stringify(actionPlan.interest_rows || []),
    })
    reloadActionWeb()
    if (actionPlan.execute_now) {
      await executeDynamicAction(result?.action)
    } else {
      toast.success(
        __(
          'Workflow action scheduled. It is now the lead’s required next action.',
        ),
      )
    }
  } catch (err) {
    toast.error(err.messages?.[0] || err.message || __('Could not plan action'))
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
    return false
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
  if (!values?.selection) return false
  const index = labels.indexOf(values.selection)
  return index >= 0 ? editInterestRecord(rows[index]) : false
}

async function editInterestRecord(row) {
  const categoryValues = await chooseInterestCategory({
    editing: true,
    interest_category: row.interest_category,
    unit_interest_status: row.unit_interest_status || 'Active',
  })
  const category = categoryValues?.interest_category
  if (!category) return false

  let values = {
    interest_category: category,
    unit_interest_status: categoryValues.unit_interest_status || 'Active',
  }
  if (['Resale', 'Primary'].includes(category)) {
    const requirements = await collectInventoryInterestRequirements(category)
    if (!requirements) return false
    const currentUnit =
      row.interest_record_type === 'Inventory Unit' ? row.name : ''
    const selectedUnit = await selectInterestUnits(category, {
      currentUnit,
      criteria: requirements,
      multiple: false,
    })
    if (!selectedUnit) return false
    values = { ...values, ...requirements, unit: selectedUnit.name }
  } else {
    const requestValues = await collectRequestInterest(
      category,
      {
        request_notes: row.request_notes,
        request_status: row.request_status || 'Open',
        international_type: row.international_type,
        international_country: row.international_country,
        international_details: row.international_details,
        preferred_area: doc.value.preferred_area,
        preferred_unit_type: doc.value.preferred_unit_type,
        buyer_budget: doc.value.buyer_budget,
      },
      { editing: true },
    )
    if (!requestValues) return false
    values = { ...values, ...requestValues }
  }

  try {
    await call('real_estate_crm_customs.api.update_interest_record', {
      lead: props.leadId,
      row_name: row.interest_row_name,
      interest_data: JSON.stringify(values),
    })
    reloadActionWeb()
    toast.success(
      ['Resale', 'Primary'].includes(category)
        ? __(
            'Selected property updated. Its details remain linked to inventory.',
          )
        : __('Interest request updated.'),
    )
    return true
  } catch (err) {
    toast.error(
      err.messages?.[0] || err.message || __('Error updating interest record'),
    )
    return false
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
  actionContext.reload()
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
// Unit selection remains available through the Add Interest workflow action.
// ---------------------------------------------------------------------------

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
