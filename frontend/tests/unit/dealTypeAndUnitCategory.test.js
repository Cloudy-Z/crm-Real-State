/* global describe, it, expect */
import {
  DEAL_BUY,
  DEAL_RENT,
  DEAL_TYPES,
  buildInterestCriteriaPayload,
  canRentCategory,
  isRentDeal,
  normalizeDealType,
  requestSnapshot,
  scopeForCategory,
  unitTypesForCategory,
} from '../../src/utils/interestWorkflow'

describe('Buy or Rent deal type', () => {
  it('offers exactly Buy and Rent, and allows Rent only for Resale or Brokerage', () => {
    expect(DEAL_TYPES).toEqual(['Buy', 'Rent'])
    expect(canRentCategory('Resale')).toBe(true)
    expect(canRentCategory('Brokerage Request')).toBe(true)
    expect(canRentCategory('Primary')).toBe(false)
    expect(canRentCategory('International')).toBe(false)
  })

  it('defaults to Buy and downgrades Rent for categories that cannot rent', () => {
    expect(normalizeDealType('')).toBe(DEAL_BUY)
    expect(normalizeDealType('anything')).toBe(DEAL_BUY)
    expect(normalizeDealType('Rent', 'Resale')).toBe(DEAL_RENT)
    expect(normalizeDealType('Rent', 'Primary')).toBe(DEAL_BUY)
    expect(isRentDeal({ dealType: 'Rent', interestCategory: 'Resale' })).toBe(true)
    expect(isRentDeal({ dealType: 'Rent', interestCategory: 'Primary' })).toBe(false)
  })

  it('always searches Owner-listed Resale inventory for Rent requests', () => {
    expect(scopeForCategory('Resale', 'Both', DEAL_RENT)).toBe('Resale')
    expect(scopeForCategory('Resale', 'Both', DEAL_BUY)).toBe('Both')
    expect(scopeForCategory('Primary', '', DEAL_BUY)).toBe('Primary')
  })

  it('reads deal type, unit category, and rent budget from a saved Interest', () => {
    const snapshot = requestSnapshot({
      name: 'INT-9',
      deal_type: 'Rent',
      requested_unit_category: 'Residential',
      requested_unit_type: 'Apartment',
      requested_rent_budget: 0,
    })
    expect(snapshot.dealType).toBe(DEAL_RENT)
    expect(snapshot.preferredUnitCategory).toBe('Residential')
    expect(snapshot.preferredUnitType).toBe('Apartment')
    expect(snapshot.rentBudget).toBe(0)
    expect(requestSnapshot({ name: 'INT-10' }).dealType).toBe(DEAL_BUY)
  })

  it('sends the rent budget and drops purchase budgets for a Rent request', () => {
    const payload = buildInterestCriteriaPayload({
      interestCategory: 'Resale',
      dealType: 'Rent',
      preferredUnitCategory: 'Residential',
      preferredUnitType: 'Apartment',
      rentBudget: '25,000',
      buyerBudget: '5,000,000',
      downPaymentBudget: '1,000,000',
      monthlyInstallmentBudget: '50,000',
      inventorySearchScope: 'Both',
    })
    expect(payload.deal_type).toBe('Rent')
    expect(payload.preferred_unit_category).toBe('Residential')
    expect(payload.rent_budget).toBe(25000)
    expect(payload.buyer_budget).toBeNull()
    expect(payload.down_payment_budget).toBeNull()
    expect(payload.monthly_installment_budget).toBeNull()
    expect(payload.inventory_search_scope).toBe('Resale')
  })

  it('keeps purchase budgets and no rent budget for a Buy request', () => {
    const payload = buildInterestCriteriaPayload({
      interestCategory: 'Primary',
      dealType: 'Rent',
      buyerBudget: '3,000,000',
      rentBudget: '20,000',
    })
    expect(payload.deal_type).toBe('Buy')
    expect(payload.buyer_budget).toBe(3000000)
    expect(payload.rent_budget).toBeNull()
  })
})

describe('Unit Category narrows Unit Type', () => {
  const types = ['Apartment', 'Villa', 'Office', 'Clinic', 'Studio']
  const map = {
    Apartment: 'Residential',
    Villa: 'Residential',
    Office: 'Commercial',
    Clinic: 'Medical',
  }

  it('returns every Unit Type when no category is chosen', () => {
    expect(unitTypesForCategory(types, map, '')).toEqual(types)
  })

  it('keeps only the chosen category types plus uncategorised legacy types', () => {
    expect(unitTypesForCategory(types, map, 'Residential')).toEqual([
      'Apartment',
      'Villa',
      'Studio',
    ])
    expect(unitTypesForCategory(types, map, 'Commercial')).toEqual(['Office', 'Studio'])
  })
})
