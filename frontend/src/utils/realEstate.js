export const REAL_ESTATE_ENTITIES = Object.freeze([
  {
    doctype: 'Real Estate Unit',
    listRouteName: 'Real Estate Units',
    formRouteName: 'Real Estate Unit',
    listPath: '/real-estate-units/view/:viewType?',
    listAlias: '/real-estate-units',
    formPath: '/real-estate-units/:recordId',
    label: 'Real Estate Units',
    entityLabel: 'Real Estate Unit',
    defaultViewName: 'Real Estate Units View',
    primaryField: 'unit_number',
    icon: 'home',
    defaults: {
      inventory_type: 'Primary',
      area_uom: 'Sq M',
      bedrooms: 0,
      bathrooms: 0,
      has_nanny_room: 0,
      has_driver_room: 0,
      has_storage_room: 0,
      has_parking: 0,
      status: 'Available',
      over_price: 0,
      remaining: 0,
    },
    secondaryFields: [
      'project',
      'destination',
      'inventory_type',
      'listing_purpose',
      'unit_category',
      'physical_unit_type',
      'status',
      'total_gross',
      'rental_monthly_rate',
      'owner_lead',
    ],
    summaryFields: [
      'sku',
      'project',
      'master_compound',
      'destination',
      'developer',
      'inventory_type',
      'listing_purpose',
      'unit_category',
      'physical_unit_type',
      'status',
      'delivery_status',
      'total_gross',
      'rental_monthly_rate',
      'owner_lead',
    ],
    fieldLabels: {
      sku: 'SKU',
      project: 'Compound / Phase',
      master_compound: 'Master Compound',
      destination: 'Destination',
      developer: 'Developer',
      inventory_type: 'Inventory Type',
      listing_purpose: 'Listing Purpose',
      rental_monthly_rate: 'Monthly Rent',
      unit_category: 'Unit Category',
      physical_unit_type: 'Unit Type',
      status: 'Availability',
      delivery_status: 'Delivery Status',
      total_gross: 'Total Gross',
      owner_lead: 'Owner Lead',
    },
  },
  {
    doctype: 'Real Estate Project',
    listRouteName: 'Real Estate Projects',
    formRouteName: 'Real Estate Project',
    listPath: '/real-estate-projects/view/:viewType?',
    listAlias: '/real-estate-projects',
    formPath: '/real-estate-projects/:recordId',
    formAlias: '/compounds/:recordId',
    label: 'Compounds',
    entityLabel: 'Compound',
    defaultViewName: 'Real Estate Projects View',
    primaryField: 'project_name',
    icon: 'building-2',
    defaults: { record_type: 'Compound', compound_area_unit: 'Sq M' },
    secondaryFields: ['record_type', 'parent_compound', 'destination', 'developer'],
    summaryFields: [
      'record_type',
      'parent_compound',
      'developer',
      'destination',
      'status',
      'compound_area',
      'compound_area_unit',
    ],
    fieldLabels: {
      record_type: 'Record Type',
      parent_compound: 'Parent Compound',
      developer: 'Developer',
      destination: 'Destination',
      status: 'Status',
      compound_area: 'Compound Area',
      compound_area_unit: 'Area Unit',
    },
  },
  {
    doctype: 'Property Developer',
    listRouteName: 'Property Developers',
    formRouteName: 'Property Developer',
    listPath: '/property-developers/view/:viewType?',
    listAlias: '/property-developers',
    formPath: '/property-developers/:recordId',
    label: 'Property Developers',
    entityLabel: 'Property Developer',
    defaultViewName: 'Property Developers View',
    primaryField: 'developer_name',
    icon: 'building-2',
    secondaryFields: ['founded_year', 'company_registration'],
    summaryFields: ['founded_year', 'company_registration'],
    fieldLabels: {
      founded_year: 'Founded In',
      company_registration: 'Company Registration',
    },
  },
  {
    doctype: 'Real Estate Destination',
    listRouteName: 'Real Estate Destinations',
    formRouteName: 'Real Estate Destination',
    listPath: '/real-estate-destinations/view/:viewType?',
    listAlias: '/real-estate-destinations',
    formPath: '/real-estate-destinations/:recordId',
    label: 'Destinations',
    entityLabel: 'Destination',
    defaultViewName: 'Real Estate Destinations View',
    primaryField: 'destination_name',
    icon: 'map-pin',
    defaults: { is_active: 1 },
    secondaryFields: ['destination_code', 'is_active'],
    summaryFields: ['destination_code', 'is_active'],
    fieldLabels: {
      destination_code: 'Code',
      is_active: 'Active',
    },
  },
  {
    doctype: 'Real Estate Unit Type',
    listRouteName: 'Real Estate Unit Types',
    formRouteName: 'Real Estate Unit Type',
    listPath: '/real-estate-unit-types/view/:viewType?',
    listAlias: '/real-estate-unit-types',
    formPath: '/real-estate-unit-types/:recordId',
    label: 'Unit Types',
    entityLabel: 'Unit Type',
    defaultViewName: 'Real Estate Unit Types View',
    primaryField: 'unit_type_name',
    icon: 'shapes',
    defaults: { is_active: 1 },
    secondaryFields: ['unit_category', 'abbreviation', 'is_active'],
    summaryFields: ['unit_category', 'abbreviation', 'is_active'],
    fieldLabels: {
      unit_category: 'Unit Category',
      abbreviation: 'Abbreviation',
      is_active: 'Active',
    },
  },
  {
    doctype: 'Real Estate Unit Category',
    listRouteName: 'Real Estate Unit Categories',
    formRouteName: 'Real Estate Unit Category',
    listPath: '/real-estate-unit-categories/view/:viewType?',
    listAlias: '/real-estate-unit-categories',
    formPath: '/real-estate-unit-categories/:recordId',
    label: 'Unit Categories',
    entityLabel: 'Unit Category',
    defaultViewName: 'Real Estate Unit Categories View',
    primaryField: 'category_name',
    icon: 'layers',
    defaults: { is_active: 1 },
    secondaryFields: ['abbreviation', 'is_active'],
    summaryFields: ['abbreviation', 'is_active'],
    fieldLabels: {
      abbreviation: 'Abbreviation',
      is_active: 'Active',
    },
  },
  {
    doctype: 'Real Estate Amenity',
    listRouteName: 'Real Estate Amenities',
    formRouteName: 'Real Estate Amenity',
    listPath: '/real-estate-amenities/view/:viewType?',
    listAlias: '/real-estate-amenities',
    formPath: '/real-estate-amenities/:recordId',
    label: 'Amenities',
    entityLabel: 'Amenity',
    defaultViewName: 'Real Estate Amenities View',
    primaryField: 'amenity_name',
    icon: 'sparkles',
    secondaryFields: ['description'],
    summaryFields: ['description'],
    fieldLabels: {
      description: 'Description',
    },
  },
])

export const REAL_ESTATE_LIST_ROUTE_NAMES = Object.freeze(
  REAL_ESTATE_ENTITIES.map((entity) => entity.listRouteName),
)

export const REAL_ESTATE_DOCTYPE_BY_LIST_ROUTE = Object.freeze(
  Object.fromEntries(
    REAL_ESTATE_ENTITIES.map((entity) => [
      entity.listRouteName,
      entity.doctype,
    ]),
  ),
)

export function realEstateEntityByDoctype(doctype) {
  return REAL_ESTATE_ENTITIES.find((entity) => entity.doctype === doctype) || null
}

export function realEstateEntityByListRoute(routeName) {
  return (
    REAL_ESTATE_ENTITIES.find(
      (entity) => entity.listRouteName === routeName,
    ) || null
  )
}

export function newRealEstateDocument(entity) {
  return {
    __newDocument: true,
    doctype: entity.doctype,
    ...(entity.defaults || {}),
  }
}

/**
 * Link filters that depend on another field of the same record.
 * The CRM portal only understands static JSON link_filters, so these rules
 * are applied by RealEstateForm as per-field property overrides.
 */
export const REAL_ESTATE_DEPENDENT_LINK_FILTERS = Object.freeze({
  'Real Estate Unit': {
    physical_unit_type: (doc) => ({
      is_active: 1,
      ...(doc?.unit_category ? { unit_category: doc.unit_category } : {}),
    }),
    unit_category: () => ({ is_active: 1 }),
  },
  'Real Estate Project': {
    parent_compound: (doc) => ({
      record_type: 'Compound',
      ...(doc?.name && !doc?.__newDocument ? { name: ['!=', doc.name] } : {}),
    }),
  },
})

export function realEstateDependentLinkFilters(doctype, doc) {
  const rules = REAL_ESTATE_DEPENDENT_LINK_FILTERS[doctype] || {}
  return Object.fromEntries(
    Object.entries(rules).map(([fieldname, rule]) => [
      fieldname,
      { link_filters: JSON.stringify(rule(doc || {})) },
    ]),
  )
}

/** Data Import page map: title, list route and record route for every master. */
export function realEstateImportDoctypeMap(base = '/crm') {
  return Object.fromEntries(
    REAL_ESTATE_ENTITIES.map((entity) => [
      entity.doctype,
      {
        title: entity.label,
        listRoute: `${base}${entity.listAlias}`,
        pageRoute: `${base}${entity.formPath.replace(':recordId', 'docname')}`,
      },
    ]),
  )
}
