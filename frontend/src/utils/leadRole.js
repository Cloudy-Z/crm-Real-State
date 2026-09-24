export const LEAD_ROLE_FIELD = 'party_type'
export const BUYER_ROLE = 'Buyer'
export const SELLER_ROLE = 'Seller'
export const LEAD_ROLES = Object.freeze([BUYER_ROLE, SELLER_ROLE])
export const LEAD_LIST_ROUTES = Object.freeze(['Leads', 'Buyers', 'Sellers'])
export const LEGACY_LEAD_ROLE_FIELDS = Object.freeze([
  'custom_type',
  'lead_type',
])

export function normalizeLeadRole(value) {
  return typeof value === 'string' && LEAD_ROLES.includes(value) ? value : null
}

export function isBuyerLead(lead) {
  return normalizeLeadRole(lead?.[LEAD_ROLE_FIELD]) === BUYER_ROLE
}

export function isSellerLead(lead) {
  return normalizeLeadRole(lead?.[LEAD_ROLE_FIELD]) === SELLER_ROLE
}

export function roleFromRouteQuery(query = {}) {
  const routeValue = String(query.party_type || query.lead_scope || '')
    .trim()
    .toLowerCase()
  if (['seller', 'sellers'].includes(routeValue)) return SELLER_ROLE
  if (['buyer', 'buyers'].includes(routeValue)) return BUYER_ROLE
  return null
}

export function roleFromRoute(route = {}) {
  return normalizeLeadRole(route.meta?.partyType) || roleFromRouteQuery(route.query)
}

export function normalizeLeadViewFilters(filters) {
  if (typeof filters === 'string') {
    try {
      filters = JSON.parse(filters)
    } catch {
      return {}
    }
  }
  if (!filters || Array.isArray(filters) || typeof filters !== 'object') {
    return {}
  }
  const cleaned = { ...filters }
  let value = cleaned.party_type
  if (Array.isArray(value)) value = value.at(-1)
  let role = normalizeLeadRole(value)

  for (const fieldname of LEGACY_LEAD_ROLE_FIELDS) {
    let legacyValue = cleaned[fieldname]
    delete cleaned[fieldname]
    if (Array.isArray(legacyValue)) legacyValue = legacyValue.at(-1)
    if (!role) role = normalizeLeadRole(legacyValue)
  }

  if (role) cleaned.party_type = role
  else delete cleaned.party_type
  return cleaned
}

export function roleFromViewFilters(filters) {
  return normalizeLeadRole(normalizeLeadViewFilters(filters).party_type)
}

function jsonList(value) {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  return Array.isArray(value) ? value : []
}

export function normalizeLeadViewColumns(columns) {
  const normalized = []
  const seen = new Set()
  for (const column of jsonList(columns)) {
    if (!column || Array.isArray(column) || typeof column !== 'object') continue
    const item = { ...column }
    let key = item.key
    if (LEGACY_LEAD_ROLE_FIELDS.includes(key)) {
      key = 'party_type'
      Object.assign(item, {
        key,
        label: 'Party Role',
        type: 'Select',
        options: LEAD_ROLES.map((value) => ({ label: value, value })),
      })
    }
    if (!key || seen.has(key)) continue
    seen.add(key)
    normalized.push(item)
  }
  return normalized
}

export function normalizeLeadViewRows(rows) {
  const normalized = []
  const seen = new Set()
  for (let fieldname of jsonList(rows)) {
    if (LEGACY_LEAD_ROLE_FIELDS.includes(fieldname)) fieldname = 'party_type'
    if (typeof fieldname !== 'string' || !fieldname || seen.has(fieldname)) {
      continue
    }
    seen.add(fieldname)
    normalized.push(fieldname)
  }
  return normalized
}

export function leadListRouteForRole(role) {
  if (role === BUYER_ROLE) return 'Buyers'
  if (role === SELLER_ROLE) return 'Sellers'
  return 'Leads'
}

export function normalizeLeadListRouteName(value) {
  return LEAD_LIST_ROUTES.includes(value) ? value : 'Leads'
}

export function normalizeLegacyLeadViewRoute(view) {
  if (!view) return view
  if (
    view.dt !== 'CRM Lead' &&
    !LEAD_LIST_ROUTES.includes(view.route_name)
  ) {
    return view
  }
  const filters = normalizeLeadViewFilters(view.filters)
  view.filters = JSON.stringify(filters)
  view.columns = JSON.stringify(normalizeLeadViewColumns(view.columns))
  view.rows = JSON.stringify(normalizeLeadViewRows(view.rows))
  const role = normalizeLeadRole(filters.party_type)
  if (view.route_name !== 'Leads') return view
  if (role) view.route_name = leadListRouteForRole(role)
  return view
}

export function canonicalLeadRoleOrDefault(value) {
  return normalizeLeadRole(value) || BUYER_ROLE
}
