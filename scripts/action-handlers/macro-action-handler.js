export class MacroActionHandler {
    baseHandler

    constructor (baseHandler) {
        this.baseHandler = baseHandler
    }

    /**
     * Build any macro actions
     * @param {object} actionList The action list
     * @override
     */
    async buildMacroActions (actionList) {
        // Get macro subcategories
        const subcategoryIds = Object.values(actionList.categories)
            .filter((category) => category.subcategories)
            .flatMap((category) =>
                Object.values(category.subcategories)
                    .filter((subcategory) => subcategory.type === 'custom')
                    .flatMap((subcategory) => subcategory.id)
            )
        if (!subcategoryIds) return

        // Get actions
        const actions = await this.getActions()

        // Add actions to action list
        for (const subcategoryId of subcategoryIds) {
            this.baseHandler.addActionsToActionList(
                actionList,
                actions,
                subcategoryId
            )
        }
    }

    /**
     * Get actions
     * @returns {object} The actions
     */
    async getActions () {
        const actionType = 'macro'
        const macros = game.macros.filter((macro) => {
            const permissions = macro.ownership
            if (permissions[game.userId]) return permissions[game.userId] > 0
            return permissions.default > 0
        })
        return macros.map((macro) => {
            const id = macro.id
            const name = macro.name
            const encodedValue = [actionType, macro.id].join(this.baseHandler.delimiter)
            const img = this.baseHandler.getImage(macro)
            const selected = true
            return {
                id,
                name,
                encodedValue,
                img,
                selected
            }
        })
    }
}
