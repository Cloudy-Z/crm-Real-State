export class CRMLead {
  onRender() {
    const existingActions = Array.isArray(this.actions) ? this.actions : []
    const realEstateActionNames = new Set([
      'real_estate_list_resale_unit',
      'real_estate_assign_property_unit',
      'real_estate_link_interested_property',
    ])

    const actions = existingActions.filter(
      (action) => !realEstateActionNames.has(action.name),
    )

    this.actions = actions
  }
}
