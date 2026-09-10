<template>
  <template v-if="normalActions.length && !isMobileView">
    <Button
      v-for="action in normalActions"
      :key="action.label"
      :label="action.label"
      @click="action.onClick(close)"
    >
      <template v-if="action.icon" #prefix>
        <FeatherIcon :name="action.icon" class="h-4 w-4" />
      </template>
    </Button>
  </template>
  <Dropdown v-if="groupedActions.length" :options="groupedActions">
    <Button icon="more-horizontal" />
  </Dropdown>
  <template v-if="groupedWithLabelActions.length && !isMobileView">
    <div v-for="g in groupedWithLabelActions" :key="g.label">
      <Dropdown v-slot="{ open }" :options="g.action">
        <Button
          :label="g.label"
          :iconRight="open ? 'chevron-up' : 'chevron-down'"
        />
      </Dropdown>
    </div>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { Dropdown } from 'frappe-ui'
import { isMobileView } from '@/composables/settings'

const props = defineProps({
  actions: { type: [Object, Array], default: () => [] },
  close: { type: Function, default: () => {} },
})

const actionList = computed(() => {
  if (Array.isArray(props.actions)) return props.actions.filter(Boolean)
  return props.actions && typeof props.actions === 'object'
    ? [props.actions]
    : []
})

function actionItem(item) {
  if (!item || typeof item !== 'object') return null
  return {
    ...item,
    onClick: () => item.onClick?.(props.close),
  }
}

function groupedAction(action) {
  const sourceItems = Array.isArray(action?.items)
    ? action.items
    : action?.label && typeof action?.onClick === 'function'
      ? [action]
      : []
  const items = sourceItems.map(actionItem).filter(Boolean)
  if (!items.length) return null
  return { ...action, items }
}

const normalActions = computed(() =>
  actionList.value.filter((action) => !action.group),
)

const groupedWithLabelActions = computed(() => {
  const actions = []

  actionList.value
    .filter((action) => action.buttonLabel && action.group)
    .forEach((action) => {
      const normalized = groupedAction(action)
      if (!normalized) return

      const groupIndex = actions.findIndex(
        (item) => item.label === action.buttonLabel,
      )
      if (groupIndex > -1) {
        actions[groupIndex].action.push(normalized)
      } else {
        actions.push({
          label: action.buttonLabel,
          action: [normalized],
        })
      }
    })

  return actions
})

const groupedActions = computed(() => {
  const actions = []
  const plainActions = normalActions.value

  if (isMobileView.value && plainActions.length) {
    actions.push({
      group: __('Actions'),
      hideLabel: true,
      items: plainActions.map(actionItem).filter(Boolean),
    })
  }
  if (isMobileView.value && groupedWithLabelActions.value.length) {
    groupedWithLabelActions.value.forEach((group) => {
      group.action.forEach((action) => actions.push(action))
    })
  }

  actionList.value
    .filter((action) => action.group && !action.buttonLabel)
    .forEach((action) => {
      const normalized = groupedAction(action)
      if (normalized) actions.push(normalized)
    })

  return actions
})
</script>
