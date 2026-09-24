import {
  BUYER_ROLE,
  SELLER_ROLE,
  canonicalLeadRoleOrDefault,
  isBuyerLead,
  isSellerLead,
  leadListRouteForRole,
  normalizeLeadListRouteName,
  normalizeLegacyLeadViewRoute,
  normalizeLeadRole,
  roleFromRoute,
  roleFromRouteQuery,
} from '@/utils/leadRole'
import { describe, expect, it } from 'vitest'

describe('Lead Party Role', () => {
  it('accepts only the two canonical persisted values', () => {
    expect(normalizeLeadRole(BUYER_ROLE)).toBe(BUYER_ROLE)
    expect(normalizeLeadRole(SELLER_ROLE)).toBe(SELLER_ROLE)
    expect(normalizeLeadRole('buyer')).toBeNull()
    expect(normalizeLeadRole('Seller Lead')).toBeNull()
    expect(normalizeLeadRole('Buyer ')).toBeNull()
    expect(normalizeLeadRole(' Seller')).toBeNull()
    expect(normalizeLeadRole('')).toBeNull()
  })

  it('never treats a blank or unknown role as Buyer or Seller', () => {
    expect(isBuyerLead({ party_type: '' })).toBe(false)
    expect(isSellerLead({ party_type: 'Owner' })).toBe(false)
    expect(isBuyerLead({ custom_type: 'Buyer' })).toBe(false)
    expect(isSellerLead({ lead_type: 'Seller' })).toBe(false)
  })

  it('defaults only new records to Buyer', () => {
    expect(canonicalLeadRoleOrDefault()).toBe(BUYER_ROLE)
    expect(canonicalLeadRoleOrDefault(SELLER_ROLE)).toBe(SELLER_ROLE)
  })

  it('maps route compatibility values only into canonical party_type values', () => {
    expect(roleFromRouteQuery({ party_type: 'Seller' })).toBe(SELLER_ROLE)
    expect(roleFromRouteQuery({ lead_scope: 'buyers' })).toBe(BUYER_ROLE)
    expect(roleFromRouteQuery({ lead_scope: 'all' })).toBeNull()
  })

  it('uses isolated route metadata before any stale compatibility query', () => {
    expect(
      roleFromRoute({
        meta: { partyType: SELLER_ROLE },
        query: { party_type: BUYER_ROLE },
      }),
    ).toBe(SELLER_ROLE)
    expect(roleFromRoute({ query: { party_type: BUYER_ROLE } })).toBe(
      BUYER_ROLE,
    )
    expect(roleFromRoute({ name: 'Leads', query: {} })).toBeNull()
  })

  it('migrates legacy role-filtered Lead views to dedicated routes', () => {
    const buyerView = {
      route_name: 'Leads',
      filters: '{"party_type":"Buyer"}',
    }
    const sellerView = {
      route_name: 'Leads',
      filters: { party_type: ['=', 'Seller'] },
    }
    expect(normalizeLegacyLeadViewRoute(buyerView).route_name).toBe('Buyers')
    expect(normalizeLegacyLeadViewRoute(sellerView).route_name).toBe('Sellers')
    expect(leadListRouteForRole(BUYER_ROLE)).toBe('Buyers')
  })

  it('allows only known Lead list routes in detail breadcrumbs', () => {
    expect(normalizeLeadListRouteName('Sellers')).toBe('Sellers')
    expect(normalizeLeadListRouteName('Buyers')).toBe('Buyers')
    expect(normalizeLeadListRouteName('Invalid Route')).toBe('Leads')
  })
})
