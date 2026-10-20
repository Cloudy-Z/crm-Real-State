/* global describe, it, expect, afterEach, vi */
import { createApp, defineComponent, h, nextTick } from 'vue'
import Autocomplete from '../../src/components/frappe-ui/Autocomplete.vue'

// Keep the real Autocomplete, HeadlessUI selection, and native form semantics.
// Popover positioning is stubbed; its target/body stay inside the form.
vi.mock('frappe-ui', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Popover: defineComponent({
      props: { show: Boolean },
      emits: ['update:show'],
      setup(props, { slots, emit }) {
        return () => h('div', [
          slots.target?.({ open: () => emit('update:show', true), togglePopover: () => emit('update:show', !props.show) }),
          slots.body?.({ isOpen: props.show }),
        ])
      },
    }),
    FeatherIcon: defineComponent({ setup: () => () => h('span') }),
  }
})

const mounted = []
afterEach(() => {
  for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }
})

function mountField({ withNextAction = false, withSelection = false } = {}) {
  const submits = vi.fn()
  const invalid = vi.fn()
  const selected = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const app = createApp(defineComponent({
    setup: () => () => h('form', {
      onSubmit: (event) => { event.preventDefault(); submits() },
      onInvalidCapture: invalid,
    }, [
      h(Autocomplete, {
        modelValue: withSelection ? 'DEST-1' : '',
        placeholder: 'Choose Destination',
        options: [{ value: 'DEST-1', label: 'First Destination' }],
        'onUpdate:modelValue': selected,
      }),
      h('select', { required: true, value: withNextAction ? 'call' : '', 'data-next-action': '' }, [
        h('option', { value: '' }, 'Select Next Action'),
        h('option', { value: 'call' }, 'Follow up'),
      ]),
      h('button', { type: 'submit', 'data-final-submit': '' }, 'Submit Action'),
    ]),
  }))
  app.config.globalProperties.__ = globalThis.__
  app.mount(host)
  mounted.push({ app, host })
  return { host, submits, invalid, selected }
}

async function openDropdown(host) {
  const trigger = host.querySelector('button:not([data-final-submit])')
  trigger.click()
  await nextTick()
  await nextTick()
  return trigger
}

describe('Requirement Link fields inside a single-submit action form', () => {
  it('opens a Link field without validating the empty Next Action', async () => {
    const { host, invalid, submits } = mountField()
    const trigger = await openDropdown(host)
    expect(trigger.type).toBe('button')
    expect(host.querySelector('input[role="combobox"]')).not.toBeNull()
    expect(invalid).not.toHaveBeenCalled()
    expect(submits).not.toHaveBeenCalled()
  })
  it('does not accidentally submit after Next Action has been completed', async () => {
    const { host, invalid, submits } = mountField({ withNextAction: true })
    await openDropdown(host)
    expect(invalid).not.toHaveBeenCalled()
    expect(submits).not.toHaveBeenCalled()
  })
  it('allows selecting a linked record before choosing Next Action', async () => {
    const { host, selected, invalid, submits } = mountField()
    await openDropdown(host)
    const search = host.querySelector('input[role="combobox"]')
    search.value = 'First'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    const option = host.querySelector('[role="option"]')
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    option.click()
    await nextTick()
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({ value: 'DEST-1' }))
    expect(invalid).not.toHaveBeenCalled()
    expect(submits).not.toHaveBeenCalled()
  })
  it('keeps Enter selection inside the picker rather than submitting the action', async () => {
    const { host, selected, invalid, submits } = mountField()
    await openDropdown(host)
    const search = host.querySelector('input[role="combobox"]')
    search.value = 'First'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(search.getAttribute('aria-activedescendant')).toBeTruthy())
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    search.dispatchEvent(enter)
    await nextTick()
    expect(enter.defaultPrevented).toBe(true)
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({ value: 'DEST-1' }))
    expect(invalid).not.toHaveBeenCalled()
    expect(submits).not.toHaveBeenCalled()
  })
  it('clears a selection without prematurely validating or submitting the form', async () => {
    const { host, selected, invalid, submits } = mountField({ withSelection: true })
    await openDropdown(host)
    const clear = host.querySelector('button.absolute')
    expect(clear.type).toBe('button')
    clear.click()
    await nextTick()
    expect(selected).toHaveBeenCalledWith(null)
    expect(invalid).not.toHaveBeenCalled()
    expect(submits).not.toHaveBeenCalled()
  })
  it('retains required Next Action validation on the actual final Submit', () => {
    const { host, invalid, submits } = mountField()
    host.querySelector('[data-final-submit]').click()
    expect(invalid).toHaveBeenCalled()
    expect(submits).not.toHaveBeenCalled()
    host.querySelector('select').value = 'call'
    host.querySelector('[data-final-submit]').click()
    expect(submits).toHaveBeenCalledTimes(1)
  })
})
