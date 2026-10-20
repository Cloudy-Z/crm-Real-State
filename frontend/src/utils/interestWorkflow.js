export const INVENTORY_SEARCH_SCOPES = Object.freeze([
  'Resale',
  'Primary',
  'Both',
])

export const CANONICAL_MEETING_PURPOSES = Object.freeze([
  'Explore Meeting',
  'Owner Meeting',
  'Developer Meeting',
])

export const CLOSING_ELIGIBLE_STATUSES = Object.freeze([
  'Offer Accepted',
  'Negotiating',
  'Shown - Interested',
])

export const COUNTERPARTY_MEETING_STATUSES = Object.freeze([
  'Offer Accepted',
  'Negotiating',
  'Shown - Considering',
  'Shown - Interested',
  'Closing',
])

export function hasValue(value) {
  return value !== null && value !== undefined && value !== ''
}

export function firstPresent(...values) {
  return values.find(hasValue)
}

export function normalizeCurrencyAmount(value) {
  if (!hasValue(value)) return null
  if (typeof value === 'number')
    return Number.isFinite(value) && value >= 0 ? value : null
  const raw = String(value).trim()
  // CurrencyBudgetInput always renders en-US grouping/decimal separators. Do
  // not accept ambiguous locale strings such as `1.234,56`: treating that as
  // 1.23456 would quietly corrupt a buyer's budget.
  if (!/^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(raw)) return null
  const normalized = Number(raw.replace(/,/g, ''))
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : null
}

export function isValidCurrencyAmount(value, { required = false } = {}) {
  if (!hasValue(value)) return !required
  return normalizeCurrencyAmount(value) !== null
}

export function formatCurrencyAmount(value, currency) {
  const amount = normalizeCurrencyAmount(value)
  if (amount === null) return '—'
  if (!currency)
    return amount.toLocaleString('en-US', { maximumFractionDigits: 2 })
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('en-US')}`.trim()
  }
}

export function isPropertyRequirement(category, internationalType = '') {
  return (
    ['Resale', 'Primary', 'Brokerage Request'].includes(category) ||
    (category === 'International' && internationalType === 'Real Estate')
  )
}

export function scopeForCategory(category, currentScope = '') {
  if (INVENTORY_SEARCH_SCOPES.includes(currentScope)) return currentScope
  return category === 'Primary' ? 'Primary' : 'Resale'
}

export function requestSnapshot(source = {}, lead = {}) {
  // A persisted Interest owns its requirement snapshot. In particular, a
  // missing field on that row means "unknown", not "replace with the Lead's
  // current default". Lead defaults are only useful while drafting a new row.
  const isPersistedInterest = Boolean(
    source.name ||
      source.workflow_status ||
      source.interest_row_name ||
      Object.keys(source).some((key) => key.startsWith('requested_')),
  )
  const fallback = (sourceValues, leadValues) =>
    firstPresent(...sourceValues, ...(isPersistedInterest ? [] : leadValues))

  return {
    preferredDestination: fallback(
      [source.requested_destination, source.preferred_destination, source.destination],
      [lead.preferred_destination],
    ) || '',
    preferredUnitType: fallback(
      [source.requested_unit_type, source.preferred_unit_type, source.unit_type],
      [lead.preferred_unit_type],
    ) || '',
    buyerBudget: fallback(
      [source.requested_budget, source.buyer_budget, source.budget],
      [lead.buyer_budget],
    ),
    downPaymentBudget: fallback(
      [
        source.requested_down_payment_budget,
        source.down_payment_budget,
      ],
      [lead.requested_down_payment_budget, lead.down_payment_budget],
    ),
    monthlyInstallmentBudget: fallback(
      [
        source.requested_monthly_installment_budget,
        source.monthly_installment_budget,
      ],
      [
        lead.requested_monthly_installment_budget,
        lead.monthly_installment_budget,
      ],
    ),
    preferredDeliveryDate: fallback(
      [
        source.requested_delivery_date,
        source.preferred_delivery_date,
        source.delivery_date,
      ],
      [lead.requested_delivery_date, lead.preferred_delivery_date],
    ) || '',
    inventorySearchScope: fallback(
      [source.inventory_search_scope],
      [lead.inventory_search_scope],
    ) || '',
    budgetCurrency: fallback(
      [source.budget_currency],
      [lead.budget_currency],
    ) || '',
    preferredProject: fallback(
      [
        source.requested_project,
        source.preferred_compound,
        source.project,
      ],
      [lead.preferred_compound],
    ) || '',
    preferredDeveloper: fallback(
      [
        source.requested_developer,
        source.preferred_developer,
        source.developer,
      ],
      [lead.preferred_developer],
    ) || '',
    preferredFinishing: fallback(
      [
        source.requested_finishing_type,
        source.preferred_finishing_type,
        source.finishing_type,
      ],
      [lead.preferred_finishing_type],
    ) || '',
  }
}

export function closingEvidenceError(
  outcome,
  { contractReference = '', contractSignedDate = '' } = {},
  today = new Date(),
) {
  if (outcome !== 'Contract Signed') return ''
  if (!String(contractReference).trim())
    return 'Contract reference is required for Contract Signed.'
  if (!isIsoDateOnOrBeforeToday(contractSignedDate, today))
    return 'Contract signed date is required and cannot be in the future.'
  return ''
}

export function isCanonicalMeetingPurpose(purpose) {
  return CANONICAL_MEETING_PURPOSES.includes(purpose)
}

export function isCanonicalMeetingAction(action = {}) {
  return action.action_type !== 'Meeting' || isCanonicalMeetingPurpose(action.purpose)
}

export function canonicalMeetingActions(actions = []) {
  return actions.filter(isCanonicalMeetingAction)
}

export function isPersistedInterestSnapshot(source = {}) {
  return Boolean(
    source.name ||
      source.workflow_status ||
      source.interest_row_name ||
      Object.keys(source).some((key) => key.startsWith('requested_')),
  )
}

export function buildInterestCriteriaPayload(draft) {
  return {
    preferred_destination: draft.preferredDestination || null,
    preferred_unit_type: draft.preferredUnitType || null,
    buyer_budget: normalizeCurrencyAmount(draft.buyerBudget),
    down_payment_budget: normalizeCurrencyAmount(draft.downPaymentBudget),
    monthly_installment_budget: normalizeCurrencyAmount(
      draft.monthlyInstallmentBudget,
    ),
    preferred_delivery_date: draft.preferredDeliveryDate || null,
    inventory_search_scope: scopeForCategory(
      draft.interestCategory,
      draft.inventorySearchScope,
    ),
    budget_currency: draft.budgetCurrency || null,
    preferred_compound: draft.preferredProject || null,
    preferred_developer: draft.preferredDeveloper || null,
    preferred_finishing_type: draft.preferredFinishing || null,
  }
}

export function closingProjectedStatus(outcome, currentStatus = 'Closing') {
  return (
    {
      'Pending Signing': 'Closing',
      'Contract Signed': 'Closed Won',
      'Return to Negotiation': 'Negotiating',
      'Buyer Withdrew': 'Rejected',
    }[outcome] || currentStatus
  )
}

export function isTerminalInterestStatus(status) {
  return [
    'Closed Won',
    'Rejected',
    'Superseded',
    'Fulfilled',
    'Cancelled',
  ].includes(status)
}

export function closingNeedsSuccessor(outcome) {
  return !['Contract Signed', 'Buyer Withdrew'].includes(outcome)
}

export function canBeginClosing(status) {
  return CLOSING_ELIGIBLE_STATUSES.includes(status)
}

export function unitSellerOwner(row = {}) {
  return row.owner_lead || row.unit_owner_lead || row.seller_owner || ''
}

export function unitDeveloper(row = {}) {
  // Requirement developer is a buyer preference, never proof of a Unit's
  // counterparty. Meetings must use Unit/project facts returned by the server.
  return row.unit_developer || row.developer || row.project_developer || ''
}

export function counterpartyMeetingPurpose(row = {}, status = '') {
  if (!COUNTERPARTY_MEETING_STATUSES.includes(status) || !row.unit) return ''
  if (row.interest_category === 'Resale' && unitSellerOwner(row))
    return 'Owner Meeting'
  if (
    row.interest_category === 'Primary' &&
    unitDeveloper(row) &&
    !unitSellerOwner(row)
  )
    return 'Developer Meeting'
  return ''
}

export function compoundFilters(destination, developer) {
  const filters = {}
  // Never widen the compound Link search before Destination is selected.
  filters.destination = destination || '__no_destination_selected__'
  if (developer) filters.developer = developer
  return filters
}

export function compoundIsCompatible(compound, destination, developer) {
  if (!compound) return true
  return (
    (!destination || compound.destination === destination) &&
    (!developer || compound.developer === developer)
  )
}

export function selectedUnitIsCompatible(unit, criteria = {}) {
  if (!unit) return true
  const scope = criteria.inventorySearchScope || ''
  const category = unit.interest_category || unit.inventory_type || unit.category
  if (scope && scope !== 'Both' && category && category !== scope) return false
  if (
    criteria.preferredDestination &&
    unit.destination &&
    unit.destination !== criteria.preferredDestination
  )
    return false
  if (
    criteria.preferredProject &&
    (unit.project || unit.project_name) &&
    (unit.project || unit.project_name) !== criteria.preferredProject
  )
    return false
  if (
    criteria.preferredDeveloper &&
    unit.developer &&
    unit.developer !== criteria.preferredDeveloper
  )
    return false
  return true
}

export function isIsoCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  )
    return false
  return true
}

export function isIsoDateOnOrBeforeToday(value, today = new Date()) {
  if (!isIsoCalendarDate(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  const localToday = new Date(today)
  const todayUtc = Date.UTC(
    localToday.getFullYear(),
    localToday.getMonth(),
    localToday.getDate(),
  )
  return parsed.getTime() <= todayUtc
}

/** Update only an unsaved dialog draft, rejecting stale master-query replies. */
export function requirementDialogDependencies(callEndpoint) {
  let requestNumber = 0
  return async (values, previous = {}) => {
    const destinationChanged = values.preferred_destination !== previous.preferred_destination
    const developerChanged = values.preferred_developer !== previous.preferred_developer
    const compoundChanged = values.preferred_compound !== previous.preferred_compound
    if (!destinationChanged && !developerChanged && !compoundChanged) return
    const request = ++requestNumber
    if (!values.preferred_destination) {
      values.preferred_compound = ''
      return
    }
    const resolveCompound = compoundChanged && Boolean(values.preferred_compound) && !destinationChanged && !developerChanged
    const response = await callEndpoint('real_estate_crm_customs.api.get_requirement_compounds', {
      destination: values.preferred_destination,
      developer: resolveCompound ? null : values.preferred_developer || null,
    })
    if (request !== requestNumber) return
    if (response?.currency && !values.budget_currency) values.budget_currency = response.currency
    const compounds = response?.compounds || []
    const current = compounds.find((item) => item.name === values.preferred_compound)
    if (values.preferred_compound && !current) values.preferred_compound = ''
    else if (resolveCompound && current) values.preferred_developer = current.developer || ''
    if (!values.preferred_compound && values.preferred_developer && compounds.length === 1)
      values.preferred_compound = compounds[0].name
  }
}
