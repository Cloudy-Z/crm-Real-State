import {
  BUYER_ROLE,
  LEGACY_OWNER_LIST_ROUTE,
  LEGACY_OWNER_ROLE,
  OWNER_LIST_ROUTE,
  OWNER_ROLE,
  canonicalLeadRoleOrDefault,
  isBuyerLead,
  isOwnerLead,
  leadListRouteForRole,
  normalizeLeadViewColumns,
  normalizeLeadViewFilters,
  normalizeLeadViewRows,
  normalizeLeadListRouteName,
  normalizeLegacyLeadViewRoute,
  normalizeLeadRole,
  roleFromRoute,
  roleFromRouteQuery,
} from '@/utils/leadRole'
import { describe, expect, it } from 'vitest'

describe('Lead Party Role', () => {
  it('accepts only the canonical persisted values', () => {
    expect(normalizeLeadRole(BUYER_ROLE)).toBe(BUYER_ROLE)
    expect(normalizeLeadRole(OWNER_ROLE)).toBe(OWNER_ROLE)
    expect(normalizeLeadRole('buyer')).toBeNull()
    expect(normalizeLeadRole('Owner Lead')).toBeNull()
    expect(normalizeLeadRole('Buyer ')).toBeNull()
    expect(normalizeLeadRole(' Owner')).toBeNull()
    expect(normalizeLeadRole('')).toBeNull()
  })

  it('reads the legacy stored Seller value as Owner until migration rewrites it', () => {
    expect(LEGACY_OWNER_ROLE).toBe('Seller')
    expect(normalizeLeadRole(LEGACY_OWNER_ROLE)).toBe(OWNER_ROLE)
    expect(isOwnerLead({ party_type: 'Seller' })).toBe(true)
    expect(isOwnerLead({ party_type: 'Owner' })).toBe(true)
    expect(isBuyerLead({ party_type: 'Seller' })).toBe(false)
  })

  it('never treats a blank, unknown, or legacy-field role as Buyer or Owner', () => {
    expect(isBuyerLead({ party_type: '' })).toBe(false)
    expect(isOwnerLead({ party_type: 'Landlord' })).toBe(false)
    expect(isBuyerLead({ custom_type: 'Buyer' })).toBe(false)
    expect(isOwnerLead({ lead_type: 'Owner' })).toBe(false)
  })

  it('defaults only new records to Buyer', () => {
    expect(canonicalLeadRoleOrDefault()).toBe(BUYER_ROLE)
    expect(canonicalLeadRoleOrDefault(OWNER_ROLE)).toBe(OWNER_ROLE)
    expect(canonicalLeadRoleOrDefault(LEGACY_OWNER_ROLE)).toBe(OWNER_ROLE)
  })

  it('maps route compatibility values, including old Seller links, to canonical roles', () => {
    expect(roleFromRouteQuery({ party_type: 'Owner' })).toBe(OWNER_ROLE)
    expect(roleFromRouteQuery({ party_type: 'Seller' })).toBe(OWNER_ROLE)
    expect(roleFromRouteQuery({ lead_scope: 'sellers' })).toBe(OWNER_ROLE)
    expect(roleFromRouteQuery({ lead_scope: 'buyers' })).toBe(BUYER_ROLE)
    expect(roleFromRouteQuery({ lead_scope: 'all' })).toBeNull()
  })

  it('uses isolated route metadata before any stale compatibility query', () => {
    expect(
      roleFromRoute({
        meta: { partyType: OWNER_ROLE },
        query: { party_type: BUYER_ROLE },
      }),
    ).toBe(OWNER_ROLE)
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
    const legacySellerView = {
      route_name: 'Leads',
      filters: { party_type: ['=', 'Seller'] },
    }
    expect(normalizeLegacyLeadViewRoute(buyerView).route_name).toBe('Buyers')
    const migrated = normalizeLegacyLeadViewRoute(legacySellerView)
    expect(migrated.route_name).toBe(OWNER_LIST_ROUTE)
    expect(JSON.parse(migrated.filters)).toEqual({ party_type: OWNER_ROLE })
    expect(leadListRouteForRole(BUYER_ROLE)).toBe('Buyers')
    expect(leadListRouteForRole(OWNER_ROLE)).toBe('Owners')
  })

  it('renames saved Sellers views to Owners', () => {
    const view = {
      dt: 'CRM Lead',
      route_name: LEGACY_OWNER_LIST_ROUTE,
      filters: '{"party_type":"Seller"}',
    }
    normalizeLegacyLeadViewRoute(view)
    expect(view.route_name).toBe('Owners')
    expect(JSON.parse(view.filters)).toEqual({ party_type: OWNER_ROLE })
  })

  it('repairs the Administrator standard view legacy role filter', () => {
    expect(normalizeLeadViewFilters('{"custom_type":"Buyer"}')).toEqual({
      party_type: BUYER_ROLE,
    })
    const view = {
      route_name: 'Leads',
      filters: '{"custom_type":"Buyer"}',
    }
    normalizeLegacyLeadViewRoute(view)
    expect(view.route_name).toBe('Buyers')
    expect(JSON.parse(view.filters)).toEqual({ party_type: BUYER_ROLE })
  })

  it('repairs legacy role columns and removes invalid saved rows', () => {
    const columns = normalizeLeadViewColumns([
      { key: 'lead_name', label: 'Name', type: 'Data' },
      { key: 'custom_type', label: 'Type', type: 'Select' },
      { key: 'party_type', label: 'Duplicate', type: 'Data' },
    ])
    expect(columns.map((column) => column.key)).toEqual(['lead_name', 'party_type'])
    expect(columns[1].options.map((option) => option.value)).toEqual([
      BUYER_ROLE,
      OWNER_ROLE,
    ])
    expect(
      normalizeLeadViewRows([
        'name',
        null,
        'custom_type',
        'party_type',
        'lead_type',
      ]),
    ).toEqual(['name', 'party_type'])
  })

  it('allows only known Lead list routes in detail breadcrumbs', () => {
    expect(normalizeLeadListRouteName('Owners')).toBe('Owners')
    expect(normalizeLeadListRouteName('Sellers')).toBe('Owners')
    expect(normalizeLeadListRouteName('Buyers')).toBe('Buyers')
    expect(normalizeLeadListRouteName('Invalid Route')).toBe('Leads')
  })
})
