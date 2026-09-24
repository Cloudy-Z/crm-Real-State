export const LEAD_ROLE_FIELD = 'party_type'
export const BUYER_ROLE = 'Buyer'
export const SELLER_ROLE = 'Seller'
export const LEAD_ROLES = Object.freeze([BUYER_ROLE, SELLER_ROLE])

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

export function canonicalLeadRoleOrDefault(value) {
  return normalizeLeadRole(value) || BUYER_ROLE
}
