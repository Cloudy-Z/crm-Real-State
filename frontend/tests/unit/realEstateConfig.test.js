import {
  REAL_ESTATE_DOCTYPE_BY_LIST_ROUTE,
  REAL_ESTATE_ENTITIES,
  REAL_ESTATE_LIST_ROUTE_NAMES,
  newRealEstateDocument,
  realEstateEntityByDoctype,
} from '@/utils/realEstate'
import { describe, expect, it } from 'vitest'

describe('real-estate entity configuration', () => {
  const expectedDoctypes = [
    'Real Estate Unit',
    'Real Estate Project',
    'Property Developer',
    'Real Estate Destination',
    'Real Estate Unit Type',
    'Real Estate Amenity',
  ]

  it('defines one list route and one dedicated form route for every master', () => {
    expect(REAL_ESTATE_ENTITIES.map((entity) => entity.doctype)).toEqual(
      expectedDoctypes,
    )
    for (const entity of REAL_ESTATE_ENTITIES) {
      expect(entity.listRouteName).toBeTruthy()
      expect(entity.formRouteName).toBeTruthy()
      expect(entity.listPath).toContain('/view/:viewType?')
      expect(entity.formPath).toContain('/:recordId')
      expect(entity.primaryField).toBeTruthy()
    }
  })

  it('keeps route and DocType lookup tables aligned', () => {
    expect(REAL_ESTATE_LIST_ROUTE_NAMES).toHaveLength(expectedDoctypes.length)
    for (const doctype of expectedDoctypes) {
      const entity = realEstateEntityByDoctype(doctype)
      expect(entity).toBeTruthy()
      expect(REAL_ESTATE_DOCTYPE_BY_LIST_ROUTE[entity.listRouteName]).toBe(
        doctype,
      )
    }
  })

  it('creates a fresh new-document payload without stale form values', () => {
    const entity = realEstateEntityByDoctype('Real Estate Unit')
    const first = newRealEstateDocument(entity)
    first.unit_number = 'stale-unit'
    const second = newRealEstateDocument(entity)

    expect(second).not.toBe(first)
    expect(second.unit_number).toBeUndefined()
    expect(second.doctype).toBe('Real Estate Unit')
    expect(second.__newDocument).toBe(true)
    expect(second.inventory_type).toBe('Primary')
  })
})
