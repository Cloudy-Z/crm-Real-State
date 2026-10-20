/* global describe, it, expect */
import {
  normalizeCurrencyAmount, isValidCurrencyAmount, requestSnapshot,
  isIsoCalendarDate, isIsoDateOnOrBeforeToday, compoundFilters,
  selectedUnitIsCompatible, counterpartyMeetingPurpose,
  canBeginClosing, closingProjectedStatus, requirementDialogDependencies,
} from '../../src/utils/interestWorkflow'

describe('Currency and calendar-date requirement contracts', () => {
  it('keeps zero separate from empty and rejects ambiguous or malformed numbers', () => {
    expect(normalizeCurrencyAmount(0)).toBe(0)
    expect(normalizeCurrencyAmount('1,250,000.50')).toBe(1250000.5)
    expect(normalizeCurrencyAmount('')).toBeNull()
    for (const value of ['1.234,56', '-1', '1,20', 'NaN', 'Infinity', 'text', Infinity])
      expect(normalizeCurrencyAmount(value)).toBeNull()
    expect(isValidCurrencyAmount('', { required: true })).toBe(false)
    expect(isValidCurrencyAmount('', { required: false })).toBe(true)
  })
  it('accepts actual future delivery dates but not malformed calendar dates', () => {
    expect(isIsoCalendarDate('2030-12-31')).toBe(true)
    expect(isIsoCalendarDate('2028-02-29')).toBe(true)
    for (const value of ['2027', 'soon', '2026-02-29', '2026-13-01', '20261020', '2026-10-20 12:00:00'])
      expect(isIsoCalendarDate(value)).toBe(false)
    expect(isIsoDateOnOrBeforeToday('2026-10-20', new Date(2026, 9, 20))).toBe(true)
    expect(isIsoDateOnOrBeforeToday('2026-10-21', new Date(2026, 9, 20))).toBe(false)
  })
  it('never borrows missing criteria from mutable Lead defaults for a persisted Interest', () => {
    const row = { name: 'INT-1', requested_budget: 0, requested_down_payment_budget: null }
    const snapshot = requestSnapshot(row, { buyer_budget: 100, down_payment_budget: 50, preferred_destination: 'OTHER' })
    expect(snapshot.buyerBudget).toBe(0)
    expect(snapshot.downPaymentBudget).toBeUndefined()
    expect(snapshot.preferredDestination).toBe('')
  })
})

describe('Independent inventory and signing policy', () => {
  it('allows Both search while preserving hard master constraints', () => {
    expect(compoundFilters('', '').destination).toBe('__no_destination_selected__')
    const criteria = { inventorySearchScope: 'Both', preferredDestination: 'D-1', preferredDeveloper: 'DEV-1' }
    const unit = { name: 'U-1', destination: 'D-1', developer: 'DEV-1' }
    expect(selectedUnitIsCompatible({ ...unit, inventory_type: 'Resale' }, criteria)).toBe(true)
    expect(selectedUnitIsCompatible({ ...unit, inventory_type: 'Primary' }, criteria)).toBe(true)
    expect(selectedUnitIsCompatible({ ...unit, destination: 'D-2' }, criteria)).toBe(false)
    expect(selectedUnitIsCompatible({ ...unit, developer: 'DEV-2' }, criteria)).toBe(false)
  })
  it('uses actual Unit counterparties, never a preference as Developer evidence', () => {
    expect(counterpartyMeetingPurpose({ name: 'R', unit: 'U-R', interest_category: 'Resale', owner_lead: 'SELLER' }, 'Closing')).toBe('Owner Meeting')
    expect(counterpartyMeetingPurpose({ name: 'P', unit: 'U-P', interest_category: 'Primary', unit_developer: 'DEV' }, 'Negotiating')).toBe('Developer Meeting')
    expect(counterpartyMeetingPurpose({ unit: 'U-P', interest_category: 'Primary', requested_developer: 'WANTED' }, 'Negotiating')).toBe('')
    expect(counterpartyMeetingPurpose({ unit: 'U-P', interest_category: 'Primary', unit_developer: 'DEV', owner_lead: 'SELLER' }, 'Negotiating')).toBe('')
  })
  it('distinguishes signing, return to negotiation, withdrawal and signed win', () => {
    expect(canBeginClosing('Offer Accepted')).toBe(true)
    expect(canBeginClosing('Shown - Interested')).toBe(true)
    expect(canBeginClosing('Shown - Considering')).toBe(false)
    expect(canBeginClosing('Matched')).toBe(false)
    expect(closingProjectedStatus('Signing Pending', 'Closing')).toBe('Closing')
    expect(closingProjectedStatus('Return to Negotiation', 'Closing')).toBe('Negotiating')
    expect(closingProjectedStatus('Buyer Withdrew', 'Closing')).toBe('Rejected')
    expect(closingProjectedStatus('Contract Signed', 'Closing')).toBe('Closed Won')
  })
})

describe('Reactive Compound/Developer dependencies', () => {
  it('fills the Developer from the selected real Compound', async () => {
    const values = { preferred_destination: 'D', preferred_compound: 'P', preferred_developer: '' }
    const update = requirementDialogDependencies(async () => ({ compounds: [{ name: 'P', developer: 'DEV' }], currency: 'EGP' }))
    await update(values, { preferred_destination: 'D', preferred_compound: '', preferred_developer: '' })
    expect(values.preferred_developer).toBe('DEV')
    expect(values.budget_currency).toBe('EGP')
  })
  it('never invents a Compound where a Developer has several eligible Compounds', async () => {
    const values = { preferred_destination: 'D', preferred_compound: '', preferred_developer: 'DEV' }
    const update = requirementDialogDependencies(async () => ({ compounds: [{ name: 'P1' }, { name: 'P2' }] }))
    await update(values, {})
    expect(values.preferred_compound).toBe('')
  })
  it('autofills a unique compatible Compound and ignores old asynchronous replies', async () => {
    let resolveOld
    const update = requirementDialogDependencies((_method, params) => params.destination === 'OLD'
      ? new Promise((resolve) => { resolveOld = resolve })
      : Promise.resolve({ compounds: [{ name: 'NEW-P' }] }))
    const values = { preferred_destination: 'OLD', preferred_compound: '', preferred_developer: 'DEV' }
    const old = update(values, {})
    values.preferred_destination = 'NEW'
    await update(values, { preferred_destination: 'OLD', preferred_developer: 'DEV' })
    expect(values.preferred_compound).toBe('NEW-P')
    resolveOld({ compounds: [{ name: 'OLD-P' }] })
    await old
    expect(values.preferred_compound).toBe('NEW-P')
  })
})
