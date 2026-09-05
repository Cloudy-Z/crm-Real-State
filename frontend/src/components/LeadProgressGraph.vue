<template>
  <div class="rounded border border-outline-gray-1 bg-surface-white p-4">
    <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="text-sm font-medium text-ink-gray-9">
          {{ __('Sales Phase Progress') }}
        </div>
        <div class="text-xs text-ink-gray-6">
          {{
            __(
              'Ideal baseline compared with this lead’s actual status transitions.',
            )
          }}
        </div>
      </div>
      <div class="flex items-center gap-4 text-xs text-ink-gray-6">
        <span class="flex items-center gap-1.5"
          ><i class="h-0.5 w-5 bg-ink-blue-4" />{{ __('Ideal') }}</span
        >
        <span class="flex items-center gap-1.5"
          ><i class="h-0.5 w-5 bg-ink-green-4" />{{ __('Actual') }}</span
        >
      </div>
    </div>

    <div
      v-if="loading"
      class="flex h-56 items-center justify-center text-sm text-ink-gray-5"
    >
      {{ __('Loading progress…') }}
    </div>
    <div
      v-else-if="!idealPoints.length"
      class="flex h-56 items-center justify-center text-sm text-ink-gray-5"
    >
      {{ __('No progress data available.') }}
    </div>
    <div v-else class="overflow-x-auto">
      <svg
        class="min-w-[640px]"
        viewBox="0 0 720 250"
        role="img"
        :aria-label="__('Lead sales phase progress chart')"
      >
        <g v-for="(stage, index) in stages" :key="stage">
          <line
            x1="145"
            :y1="stageY(index)"
            x2="690"
            :y2="stageY(index)"
            stroke="currentColor"
            class="text-outline-gray-1"
          />
          <text
            x="136"
            :y="stageY(index) + 4"
            text-anchor="end"
            class="fill-ink-gray-6 text-[11px]"
          >
            {{ __(stage) }}
          </text>
        </g>

        <line
          x1="145"
          y1="215"
          x2="690"
          y2="215"
          stroke="currentColor"
          class="text-outline-gray-2"
        />
        <g v-for="tick in timeTicks" :key="tick">
          <line
            :x1="timeX(tick)"
            y1="215"
            :x2="timeX(tick)"
            y2="220"
            stroke="currentColor"
            class="text-outline-gray-2"
          />
          <text
            :x="timeX(tick)"
            y="237"
            text-anchor="middle"
            class="fill-ink-gray-5 text-[10px]"
          >
            {{ formatHours(tick) }}
          </text>
        </g>

        <polyline
          :points="idealPolyline"
          fill="none"
          stroke="#4C6EF5"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <polyline
          v-if="actualPoints.length"
          :points="actualPolyline"
          fill="none"
          stroke="#12B886"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <g v-for="point in idealPoints" :key="`ideal-${point.status}`">
          <circle
            :cx="timeX(point.hours)"
            :cy="stageY(stageIndex(point.status))"
            r="4"
            fill="#4C6EF5"
          />
        </g>
        <g
          v-for="(point, index) in actualPoints"
          :key="`actual-${index}-${point.status}`"
        >
          <circle
            :cx="timeX(point.hours)"
            :cy="stageY(stageIndex(point.status))"
            r="5"
            fill="#12B886"
          >
            <title>
              {{ point.status }} — {{ formatHours(point.hours) }} —
              {{ point.action || '' }}
            </title>
          </circle>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  progress: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
})

const stages = [
  'New',
  'Fresh Lead',
  'Requested',
  'Offer Sent',
  'Negotiating',
  'Offer Selected',
]
const idealPoints = computed(() => props.progress?.ideal || [])
const actualPoints = computed(() => props.progress?.actual || [])
const maxHours = computed(() => {
  const values = [...idealPoints.value, ...actualPoints.value].map((point) =>
    Number(point.hours || 0),
  )
  return Math.max(24, ...values)
})
const timeTicks = computed(() => [
  0,
  maxHours.value / 4,
  maxHours.value / 2,
  (maxHours.value * 3) / 4,
  maxHours.value,
])
const idealPolyline = computed(() => linePoints(idealPoints.value))
const actualPolyline = computed(() => linePoints(actualPoints.value))

function stageIndex(status) {
  const index = stages.indexOf(status)
  return index === -1 ? 0 : index
}

function stageY(index) {
  return 200 - index * 34
}

function timeX(hours) {
  return 145 + (Number(hours || 0) / maxHours.value) * 545
}

function linePoints(points) {
  return points
    .map((point) => `${timeX(point.hours)},${stageY(stageIndex(point.status))}`)
    .join(' ')
}

function formatHours(hours) {
  const value = Number(hours || 0)
  if (value >= 24) return `${Math.round(value / 24)}d`
  return `${Math.round(value)}h`
}
</script>
