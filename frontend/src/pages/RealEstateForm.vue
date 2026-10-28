<template>
  <LayoutHeader v-if="isNew || doc.name">
    <template #left-header>
      <Breadcrumbs :items="breadcrumbs" />
    </template>
    <template #right-header>
      <div class="flex items-center gap-2">
        <Button
          v-if="isManager() && !isMobileView"
          :label="__('Edit Layout')"
          variant="subtle"
          icon-left="layout-template"
          @click="showLayoutEditor = true"
        />
        <Button
          v-if="canReleaseLease"
          :label="__('Return to Market')"
          variant="subtle"
          icon-left="rotate-ccw"
          :loading="releasingLease"
          @click="releaseLease"
        />
        <Button
          v-if="!isNew && canDelete"
          :label="__('Delete')"
          variant="subtle"
          theme="red"
          icon-left="trash-2"
          @click="showDeleteModal = true"
        />
        <Button
          :label="isNew ? __('Create') : __('Save')"
          variant="solid"
          :loading="saving"
          :disabled="!isNew && !canWrite"
          @click="saveRecord"
        />
      </div>
    </template>
  </LayoutHeader>

  <div
    v-if="isNew || doc.name"
    class="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-surface-gray-1"
  >
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-6">
      <section class="rounded-xl border bg-surface-white p-5 shadow-sm">
        <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div class="min-w-0">
            <p class="text-sm font-medium text-ink-gray-5">
              {{ __(config.entityLabel) }}
            </p>
            <h1 class="mt-1 truncate text-2xl font-semibold text-ink-gray-9">
              {{ title }}
            </h1>
            <p v-if="!isNew" class="mt-1 text-sm text-ink-gray-5">
              {{ doc.name }}
            </p>
          </div>
          <div
            v-if="summaryRows.length"
            class="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-3xl lg:grid-cols-3"
          >
            <div
              v-for="row in summaryRows"
              :key="row.fieldname"
              class="rounded-lg bg-surface-gray-1 px-3 py-2"
            >
              <p class="text-xs font-medium text-ink-gray-5">
                {{ __(row.label) }}
              </p>
              <p class="mt-1 truncate text-sm text-ink-gray-9">
                {{ formatSummaryValue(row.value) }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-xl border bg-surface-white p-4 shadow-sm sm:p-6">
        <FieldLayout
          v-if="layout.data"
          :key="canWrite ? 'write' : 'read'"
          :tabs="layout.data"
          :data="doc"
          :doctype="doctype"
          :context="canWrite ? null : fieldLayoutContext"
        />
        <div v-else class="py-10 text-center text-sm text-ink-gray-5">
          {{ __('Loading form...') }}
        </div>
        <ErrorMessage v-if="formError" class="mt-4" :message="__(formError)" />
      </section>

      <section
        v-if="showPhasesPanel"
        class="rounded-xl border bg-surface-white p-4 shadow-sm sm:p-6"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-ink-gray-9">
            {{ __('Phases') }}
            <span class="ml-1 text-sm font-normal text-ink-gray-5">
              ({{ phases.data?.length || 0 }})
            </span>
          </h2>
          <Button
            v-if="doctypePermissions.data?.create"
            :label="__('Add Phase')"
            variant="subtle"
            icon-left="plus"
            @click="addPhase"
          />
        </div>
        <p
          v-if="!phases.data?.length"
          class="mt-3 text-sm text-ink-gray-5"
        >
          {{ __('This Compound has no Phases yet.') }}
        </p>
        <ul v-else class="mt-3 divide-y rounded-lg border">
          <li
            v-for="phase in phases.data"
            :key="phase.name"
            class="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-surface-gray-1"
            @click="openPhase(phase.name)"
          >
            <span class="truncate text-ink-gray-9">
              {{ phase.project_name || phase.name }}
            </span>
            <span class="shrink-0 text-ink-gray-5">
              {{ phase.status || __('No status') }}
            </span>
          </li>
        </ul>
      </section>
    </div>
  </div>

  <ErrorPage
    v-else-if="errorTitle"
    :errorTitle="errorTitle"
    :errorMessage="errorMessage"
  />

  <DataFieldsModal
    v-if="showLayoutEditor"
    v-model="showLayoutEditor"
    :doctype="doctype"
    @reload="layout.reload"
  />

  <DeleteLinkedDocModal
    v-if="showDeleteModal && !isNew"
    v-model="showDeleteModal"
    :doctype="doctype"
    :docname="recordId"
    :name="config.listRouteName"
  />
</template>

<script setup>
import DataFieldsModal from '@/components/Modals/DataFieldsModal.vue'
import DeleteLinkedDocModal from '@/components/DeleteLinkedDocModal.vue'
import ErrorPage from '@/components/ErrorPage.vue'
import FieldLayout from '@/components/FieldLayout/FieldLayout.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import { isMobileView } from '@/composables/settings'
import { useDocument } from '@/data/document'
import { usersStore } from '@/stores/users'
import {
  newRealEstateDocument,
  realEstateDependentLinkFilters,
  realEstateEntityByDoctype,
} from '@/utils/realEstate'
import { Breadcrumbs, call, createResource, toast, usePageMeta } from 'frappe-ui'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  recordId: { type: String, required: true },
})

const route = useRoute()
const router = useRouter()
const { isManager } = usersStore()

const config = route.meta?.realEstate || realEstateEntityByDoctype(route.meta?.doctype)
const doctype = config.doctype
const isNew = computed(() => props.recordId === 'new')
const docname = isNew.value ? null : props.recordId

const showDeleteModal = ref(false)
const showLayoutEditor = ref(false)
const formError = ref('')
const errorTitle = ref('')
const errorMessage = ref('')

const {
  document,
  permissions,
  error,
  triggerOnBeforeCreate,
  triggerOnValidate,
  checkMandatory,
  triggerOnRender,
} = useDocument(doctype, docname)

const doc = computed(() => document.doc || {})
const doctypePermissions = createResource({
  url: 'real_estate_crm_customs.api.get_real_estate_doctype_permissions',
  params: { doctype },
  auto: true,
})
const canWrite = computed(() =>
  isNew.value
    ? Boolean(doctypePermissions.data?.create)
    : Boolean(permissions.data?.permissions?.write),
)
const canDelete = computed(
  () => permissions.data?.permissions?.delete || false,
)
const saving = computed(() => document.save?.loading || create.loading)
// A Rented Unit returns to the market only through this manager action.
const releasingLease = ref(false)
const canReleaseLease = computed(
  () =>
    doctype === 'Real Estate Unit' &&
    !isNew.value &&
    doc.value?.status === 'Rented' &&
    isManager(),
)
async function releaseLease() {
  if (releasingLease.value) return
  if (!window.confirm(__('The lease has ended and this Unit is available again?'))) return
  releasingLease.value = true
  try {
    await call('real_estate_crm_customs.api.release_rented_unit', {
      unit: doc.value.name,
    })
    await document.reload()
    toast.success(__('Unit returned to the market as Available.'))
  } catch (err) {
    toast.error(err.messages?.[0] || err.message || __('Could not return the Unit to the market.'))
  } finally {
    releasingLease.value = false
  }
}
const title = computed(() => {
  if (isNew.value) return __('New {0}', [config.entityLabel])
  return doc.value?.[config.primaryField] || doc.value?.name || props.recordId
})

const summaryRows = computed(() =>
  (config.summaryFields || config.secondaryFields || [])
    .filter((fieldname) => doc.value?.[fieldname] !== undefined)
    .map((fieldname) => ({
      fieldname,
      label: config.fieldLabels?.[fieldname] || fieldname,
      value: doc.value?.[fieldname],
    })),
)

const breadcrumbs = computed(() => [
  {
    label: __(config.label),
    route: {
      name: config.listRouteName,
      params: route.query.viewType
        ? { viewType: route.query.viewType }
        : undefined,
      query: route.query.view ? { view: route.query.view } : undefined,
    },
  },
  {
    label: title.value,
    route: isNew.value
      ? undefined
      : {
          name: config.formRouteName,
          params: { recordId: props.recordId },
        },
  },
])

const layout = createResource({
  url: 'crm.fcrm.doctype.crm_fields_layout.crm_fields_layout.get_fields_layout',
  cache: ['RealEstateDataFields', doctype],
  params: { doctype, type: 'Data Fields' },
  auto: true,
})

const fieldLayoutContext = computed(() => {
  const fieldPropertyOverrides = {
    ...(document.fieldPropertyOverrides || {}),
  }
  if (!canWrite.value) {
    for (const topLevel of layout.data || []) {
      const sections = Array.isArray(topLevel.sections)
        ? topLevel.sections
        : [topLevel]
      for (const section of sections) {
        for (const column of section.columns || []) {
          for (const field of column.fields || []) {
            const fieldname = field.fieldname || field.name || field
            fieldPropertyOverrides[fieldname] = {
              ...(fieldPropertyOverrides[fieldname] || {}),
              read_only: true,
            }
          }
        }
      }
    }
  }
  return { fieldPropertyOverrides }
})

const create = createResource({
  url: 'frappe.client.insert',
  onSuccess(data) {
    toast.success(__('{0} created successfully', [config.entityLabel]))
    router.replace({
      name: config.formRouteName,
      params: { recordId: data.name },
    })
  },
  onError(err) {
    formError.value =
      err.messages?.[0] || err.message || __('Could not create document')
  },
})

/**
 * Apply link filters that depend on other fields of this record
 * (Unit Type by Unit Category, Parent Compound limited to Compounds).
 * Existing script overrides for the same field are preserved.
 */
function applyDependentLinkFilters() {
  const dependent = realEstateDependentLinkFilters(doctype, document.doc)
  if (!Object.keys(dependent).length) return
  if (!document.fieldPropertyOverrides) document.fieldPropertyOverrides = {}
  for (const [fieldname, value] of Object.entries(dependent)) {
    const current = document.fieldPropertyOverrides[fieldname] || {}
    if (current.link_filters === value.link_filters) continue
    document.fieldPropertyOverrides[fieldname] = { ...current, ...value }
  }
}

watch(
  () => [
    document.doc?.name,
    document.doc?.unit_category,
    document.doc?.record_type,
  ],
  applyDependentLinkFilters,
  { immediate: true },
)

// A Unit Type from another category is cleared when the category changes,
// so the saved category always matches the Unit Type (the server enforces it).
watch(
  () => document.doc?.unit_category,
  async (category, previous) => {
    if (doctype !== 'Real Estate Unit') return
    if (!category || category === previous) return
    const unitType = document.doc?.physical_unit_type
    if (!unitType) return
    try {
      const row = await call('frappe.client.get_value', {
        doctype: 'Real Estate Unit Type',
        filters: unitType,
        fieldname: 'unit_category',
      })
      if (
        row?.unit_category &&
        row.unit_category !== category &&
        document.doc?.physical_unit_type === unitType &&
        document.doc?.unit_category === category
      ) {
        document.doc.physical_unit_type = null
      }
    } catch {
      // Lookup failures are harmless; the server keeps category and type consistent.
    }
  },
)

const showPhasesPanel = computed(
  () =>
    doctype === 'Real Estate Project' &&
    !isNew.value &&
    Boolean(doc.value?.name) &&
    doc.value?.record_type !== 'Phase',
)

const phases = createResource({
  url: 'frappe.client.get_list',
  makeParams() {
    return {
      doctype: 'Real Estate Project',
      filters: { parent_compound: props.recordId },
      fields: ['name', 'project_name', 'status'],
      order_by: 'project_name asc',
      limit_page_length: 0,
    }
  },
  auto: doctype === 'Real Estate Project' && !isNew.value,
})

function openPhase(name) {
  router.push({ name: config.formRouteName, params: { recordId: name } })
}

function addPhase() {
  router.push({
    name: config.formRouteName,
    params: { recordId: 'new' },
    query: { parent_compound: props.recordId },
  })
}

function formatSummaryValue(value) {
  if (value === null || value === undefined || value === '') return __('—')
  if (value === 1 || value === true) return __('Yes')
  if (value === 0 || value === false) return __('No')
  return value
}

async function saveRecord() {
  formError.value = ''
  if (!canWrite.value) {
    formError.value = isNew.value
      ? __('You do not have permission to create this document.')
      : __('You do not have permission to update this document.')
    return
  }
  if (isNew.value) {
    try {
      await triggerOnBeforeCreate?.()
      await triggerOnValidate?.()
    } catch (err) {
      formError.value =
        err.messages?.[0] || err.message || __('Could not validate document')
      return
    }
    if (checkMandatory(document.doc)) return
    create.submit({
      doc: {
        doctype,
        ...document.doc,
      },
    })
    return
  }

  document.save.submit(null, {
    onSuccess() {
      toast.success(__('{0} updated successfully', [config.entityLabel]))
      document.reload?.()
    },
    onError(err) {
      formError.value =
        err.messages?.[0] || err.message || __('Could not update document')
    },
  })
}

watch(error, (err) => {
  if (!err) {
    errorTitle.value = ''
    errorMessage.value = ''
    return
  }
  errorTitle.value = __(
    err.exc_type === 'DoesNotExistError'
      ? 'Document not found'
      : 'Error occurred',
  )
  errorMessage.value = __(err.messages?.[0] || 'An error occurred')
})

usePageMeta(() => ({ title: title.value }))

onMounted(async () => {
  if (isNew.value) {
    document.doc = newRealEstateDocument(config)
    document.fieldPropertyOverrides = {}
    if (doctype === 'Real Estate Project' && route.query.parent_compound) {
      document.doc.record_type = 'Phase'
      document.doc.parent_compound = String(route.query.parent_compound)
    }
  }
  applyDependentLinkFilters()
  await triggerOnRender?.()
})

onBeforeUnmount(() => {
  if (!isNew.value) return
  document.doc = newRealEstateDocument(config)
  document.fieldPropertyOverrides = {}
})
</script>
