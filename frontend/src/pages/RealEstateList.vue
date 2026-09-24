<template>
  <LayoutHeader>
    <template #left-header>
      <ViewBreadcrumbs
        v-model="viewControls"
        :routeName="routeName"
        :label="displayName"
      />
    </template>
    <template #right-header>
      <Button
        v-if="canCreate"
        variant="solid"
        :label="__('Create')"
        iconLeft="plus"
        @click="createRecord"
      />
    </template>
  </LayoutHeader>

  <ViewControls
    ref="viewControls"
    v-model="records"
    v-model:loadMore="loadMore"
    v-model:updatedPageCount="updatedPageCount"
    :doctype="doctype"
    :options="{
      hideColumnsButton: false,
      defaultViewName: __(defaultViewName),
    }"
  />

  <div class="flex-1 overflow-y-auto">
    <div
      v-if="records.data?.data?.length"
      class="divide-y border-t"
    >
      <div
        v-for="record in records.data.data"
        :key="record.name"
        class="group flex cursor-pointer items-center justify-between gap-4 px-5 py-3 hover:bg-surface-menu-bar"
        @click="editRecord(record.name)"
      >
        <div class="min-w-0 flex-1">
          <div class="truncate text-base font-medium text-ink-gray-9">
            {{ getPrimaryLabel(record) }}
          </div>
          <div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-gray-6">
            <span v-for="field in secondaryFields" v-show="record[field]" :key="field">
              {{ __(fieldLabels[field] || field) }}: {{ record[field] }}
            </span>
          </div>
        </div>
        <Button
          icon="edit-3"
          variant="ghosted"
          class="opacity-0 group-hover:opacity-100"
          @click.stop="editRecord(record.name)"
        />
      </div>
    </div>
  </div>

  <ListFooter
    v-if="records.data?.data?.length"
    v-model="records.data.page_length_count"
    class="border-t px-3 py-2 sm:px-5"
    :options="{
      rowCount: records.data.row_count,
      totalCount: records.data.total_count,
    }"
    @loadMore="() => loadMore++"
  />
  <EmptyState v-else :name="displayName" />
</template>

<script setup>
import ViewBreadcrumbs from '@/components/ViewBreadcrumbs.vue'
import LayoutHeader from '@/components/LayoutHeader.vue'
import ViewControls from '@/components/ViewControls.vue'
import EmptyState from '@/components/ListViews/EmptyState.vue'
import { ListFooter, createResource } from 'frappe-ui'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const records = ref({})
const loadMore = ref(1)
const updatedPageCount = ref(20)
const viewControls = ref(null)

const pageConfig = computed(() => route.meta?.realEstate || {})
const doctype = computed(() => pageConfig.value.doctype)
const routeName = computed(() => pageConfig.value.listRouteName || route.name)
const displayName = computed(() => pageConfig.value.label || routeName.value)
const defaultViewName = computed(() => pageConfig.value.defaultViewName || `${routeName.value} View`)
const primaryField = computed(() => pageConfig.value.primaryField || 'name')
const secondaryFields = computed(() => pageConfig.value.secondaryFields || [])
const fieldLabels = computed(() => pageConfig.value.fieldLabels || {})

const doctypePermissions = createResource({
  url: 'real_estate_crm_customs.api.get_real_estate_doctype_permissions',
  params: { doctype: doctype.value },
  auto: true,
})
const canCreate = computed(() => Boolean(doctypePermissions.data?.create))

watch(
  () => records.value?.data?.page_length_count,
  (val, oldValue) => {
    if (!val || val === oldValue) return
    updatedPageCount.value = val
  },
)

function getPrimaryLabel(record) {
  return record?.[primaryField.value] || record?.name
}

function createRecord() {
  router.push({
    name: pageConfig.value.formRouteName,
    params: { recordId: 'new' },
    query: {
      view: route.query.view,
      viewType: route.params.viewType,
    },
  })
}

function editRecord(name) {
  router.push({
    name: pageConfig.value.formRouteName,
    params: { recordId: name },
    query: {
      view: route.query.view,
      viewType: route.params.viewType,
    },
  })
}
</script>
