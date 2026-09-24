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
  realEstateEntityByDoctype,
} from '@/utils/realEstate'
import { Breadcrumbs, createResource, toast, usePageMeta } from 'frappe-ui'
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
  }
  await triggerOnRender?.()
})

onBeforeUnmount(() => {
  if (!isNew.value) return
  document.doc = newRealEstateDocument(config)
  document.fieldPropertyOverrides = {}
})
</script>
