# CRM — Project Context

## What this project is

Frappe CRM frontend. Vue 3 + frappe-ui. The backend is Frappe Python. Scripts in
`frontend/` only; Python in `crm/` (Frappe app). No build step for Form Scripts —
they run as evaluated strings in the browser.

---

## Where to read before working

| Task | Read first |
|---|---|
| What are we building next | [PLAN.md](./.pi/PLAN.md) |
| Stable API contracts (setFieldProperty, formDialog, helpers) | [SPEC.md](./.pi/SPEC.md) |
| Why code is the way it is (decisions, bugs fixed, history) | [ARCHIVE.md](./.pi/ARCHIVE.md) |
| Form scripting user guide | [feats/form-scripting/guide.md](./.pi/feats/form-scripting/guide.md) |
| formDialog() API reference | [feats/form-scripting/form-dialog.md](./.pi/feats/form-scripting/form-dialog.md) |

---

## Key files

### Scripting engine
| File | Role |
|---|---|
| `frontend/src/data/document.js` | `useDocument` — loads doc, wires script, patches `save.submit`, exposes triggers |
| `frontend/src/data/script.js` | `getScript` — fetches Form Script records, evaluates class via `new Function`, injects helpers, `setupHelperMethods` |
| `frontend/src/utils/scriptHelpers.js` | `createDocProxy`, `getClassNames` — extracted pure helpers |

### Field rendering
| File | Role |
|---|---|
| `frontend/src/components/FieldLayout/FieldLayout.vue` | Tab/section/column layout. Accepts `context` prop for standalone mode (no useDocument) |
| `frontend/src/components/FieldLayout/Field.vue` | Renders a single field. Calls `useDocument` unless `fieldLayoutContext` is injected |
| `frontend/src/components/FieldLayout/Section.vue` | Section with CollapsibleSection |
| `frontend/src/components/FieldLayout/Column.vue` | Column wrapper |

### Form dialog system
| File | Role |
|---|---|
| `frontend/src/components/Modals/FieldLayoutDialog.vue` | Dialog shell + standalone FieldLayout + local reactive doc |
| `frontend/src/components/Modals/FieldLayoutDialogContainer.vue` | Renders dialog entries from reactive array |
| `frontend/src/utils/renderFieldLayoutDialog.js` | `formDialog()` — pushes to array, returns Promise |
| `frontend/src/components/Modals/GlobalModals.vue` | Mounts FieldLayoutDialogContainer + other app-wide modals |

### Field transforms & validation
| File | Role |
|---|---|
| `frontend/src/utils/fieldTransforms.js` | `processField()`, `findMissingMandatory()`, `parseLinkFilters()` — pure, tested |
| `frontend/src/utils/expressions.js` | `evaluateDependsOnValue()`, `evaluateExpression()` |

### Meta & stores
| File | Role |
|---|---|
| `frontend/src/stores/meta.js` | `getMeta(doctype)` — fetches DocType meta, exposes `getFields()`, formatters |
| `frontend/src/stores/global.js` | `$dialog`, `$socket`, `makeCall` |

---

## Tests

```bash
cd frontend
yarn test:run      # single run
yarn test          # watch mode
```

- **159 tests in 11 files** (28 Oct 2026) — all must pass before committing
- Location: `frontend/tests/unit/`
- Mostly pure utility tests; `autocompleteFormSafety.test.js` mounts components (Vue plugin enabled in Vitest)
- Add tests in `tests/unit/` when adding pure logic to `src/utils/`

---

## Commit style

```
feat: short description
fix: short description
refactor: short description
test: short description
docs: short description
```

Multiple logical commits per PR — one commit per coherent change, not one giant commit.
Pre-commit hooks run prettier + eslint + oxlint automatically. If they modify a file,
`git add` the file again and re-commit.

---

## Docs structure

```
PLAN.md          — future only (phases 3B, 4, 5, 6)
SPEC.md          — stable contracts
ARCHIVE.md       — completed phases + decision rationale
feats/           — user-facing feature docs
archives/        — old docs preserved verbatim
```

When a phase completes: move its spec from PLAN.md to ARCHIVE.md, update SPEC.md if
the API surface changed.

---

## Real-estate customization (read this before touching real-estate screens)

This fork is the **portal UI** of a real-estate CRM. The business rules, data model, migrations and API live in the companion custom app **`Cloudy-Z/crm-Real-State-Customs`** (branch `main`, app `real_estate_crm_customs`). Read these two files there first:

- `AGENTS.md`: invariants, workflow model, incident log and safe-change procedures (AI-agent knowledge base).
- `docs/TECHNICAL_GUIDE.md`: the full human-readable technical guide, with diagrams.

Snapshot: 28 Oct 2026, fork `develop` at `1810fd3c`.

### Rules that bind this UI

1. **The server is the authority.** Every rule shown here is also enforced in the custom app. Never add a UI-only rule, and never bypass server validation.
2. **Role = `party_type` only**, with exactly `Buyer` or `Owner`. Use `src/utils/leadRole.js` (`OWNER_ROLE`, `isOwnerLead`, route helpers). Legacy `Seller` values and `/sellers` links are only mapped to Owner for compatibility.
3. **Lead status and qualification (`interest_status`) are read-only.** Never render them as editable.
4. **Buyer actions use one popup with one atomic submit**: `LeadUnifiedActionDialog.vue` → `submit_lead_action_bundle`. Fields appear step by step. All requirement fields must be fillable **before** a Next Action is chosen. Next Action is validated only at final submit. Notes are optional.
5. **Every non-submit `<button>` inside a `<form>` must have `type="button"`.** A missing type caused the "cannot fill requirement until Next Action is chosen" bug (`components/frappe-ui/Autocomplete.vue`, tests in `tests/unit/autocompleteFormSafety.test.js`).
6. **Interests are created only inside the action cycle.** There is no direct "Add Interest" button elsewhere.
7. **Owners own Units; Buyers link Units only through Interests.** Owner Lead page: Add Property (`create_resale_unit`, Listing Purpose For Sale / For Rent / For Sale or Rent, rents when renting).
8. **Phone fields** use `components/Controls/PhoneInput.vue` (country selector with flags, `libphonenumber-js`), which stores the Desk format `+CC-NUMBER`.
9. Use **Yarn** with the existing lockfile. Do not commit pnpm or npm artifacts. Restore `frontend/auto-imports.d.ts` and `frontend/components.d.ts` if a build only regenerated them.

### Real-estate file map (`frontend/src`)

| File | Responsibility |
|---|---|
| `pages/Lead.vue` | Lead page (Buyer and Owner variants), flags and actions card, WhatsApp and call buttons, Properties tab, Add Property, requirement edit dialogs. |
| `components/LeadUnifiedActionDialog.vue` | The single Buyer action popup: results, requirements (Deal Type, Destination, Unit Category → Unit Type, budgets), Smart Match, meetings, closing, Next Action. |
| `components/Modals/UnitSelectionDialog.vue` | Smart Match picker with dependent filters, scores, reasons and gaps, multi-select. |
| `components/LeadInterestWorkboard.vue` | One row per Interest with its legal row actions. |
| `components/LeadActionWeb.vue`, `LeadSmartEvents.vue`, `LeadProgressGraph.vue`, `LeadInterestGroups.vue` | Current action, prioritised events, ideal-versus-actual graph, grouped Interests. |
| `pages/RealEstateList.vue`, `pages/RealEstateForm.vue` | Generic list and form pages for the 7 masters; dependent Link filters, Compound Phases panel, manager Return to Market for Rented Units. |
| `utils/realEstate.js` | `REAL_ESTATE_ENTITIES` (routes, columns, summary fields), dependent filter rules, Data Import doctype map. |
| `utils/interestWorkflow.js` | Requirement snapshot, payload builders, Deal Type / Unit Category / rent budget helpers. |
| `utils/leadRole.js` | Buyer and Owner roles and routes (`/buyers`, `/owners`; `/sellers` redirects). |
| `router.js`, `components/Layouts/AppSidebar.vue`, `components/Mobile/MobileSidebar.vue` | Routes and sidebar entries for Buyers, Owners and the masters. |

### Adding a real-estate master page
Add an entry to `REAL_ESTATE_ENTITIES` in `utils/realEstate.js`, add sidebar entries (desktop and mobile), make sure the Data Import map includes it, add the DocType to the backend master lists, and update `tests/unit/realEstateConfig.test.js`.

### Verify before committing

```bash
cd frontend
yarn install --frozen-lockfile
yarn test:run
npx eslint <changed files>
yarn build
git checkout -- auto-imports.d.ts components.d.ts   # if only regenerated
```

Deploy order on Frappe Cloud: custom app first (migrate), then this fork, then a hard refresh in the browser.
