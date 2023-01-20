export class GenericActionHandler {
    baseHandlers

    constructor (baseHandler) {
        this.baseHandler = baseHandler
    }

    /**
     * Build generic actions
     * @param {object} character The actor and/or token
     */
    buildGenericActions (character) {
        this._buildConditions(character)
        this._buildUtilities(character)
    }

    /**
     * Build conditions
     * @private
     * @param {object} character The actor and/or token
     */
    _buildConditions (character) {}

    /**
     * Build utilities
     * @private
     * @param {object} character The actor and/or token
     */
    _buildUtilities (character) {
        if (character) {
            this._buildSingleTokenUtilities(character)
        } else {
            this._buildMultipleTokenUtilities()
        }
    }

    /**
     * Build utilities for a single token
     * @private
     * @param {object} character The actor and/or token
     */
    _buildSingleTokenUtilities (character) {
        const actorId = character.actor?.id
        const tokenId = character.token?.id
        if (!tokenId) return
        const actionType = 'utility'
        const actions = []

        // Build Toggle Combat action
        const toggleCombatId = 'toggleCombat'
        const inCombat = canvas.tokens.placeables.find(
            (token) => token.id === tokenId
        ).inCombat
        const toggleCombatName = inCombat
            ? this.baseHandler.i18n('tokenActionHud.removeFromCombat')
            : this.baseHandler.i18n('tokenActionHud.addToCombat')
        const toggleCombatEncodedValue = [
            actionType,
            actorId,
            tokenId,
            toggleCombatId
        ].join(this.baseHandler.delimiter)
        const toggleCombatAction = {
            id: toggleCombatId,
            name: toggleCombatName,
            encodedValue: toggleCombatEncodedValue,
            selected: true
        }
        actions.push(toggleCombatAction)

        // Build Toggle Visibility action
        if (game.user.isGM) {
            const toggleVisibilityId = 'toggleVisibility'
            const hidden = canvas.tokens.placeables.find((token) => token.id === tokenId).document.hidden
            const toggleVisibilityName = hidden
                ? this.baseHandler.i18n('tokenActionHud.makeVisible')
                : this.baseHandler.i18n('tokenActionHud.makeInvisible')
            const toggleVisbilityEncodedValue = [
                actionType,
                actorId,
                tokenId,
                toggleVisibilityId
            ].join(this.baseHandler.delimiter)
            const toggleVisibilityAction = {
                id: toggleVisibilityId,
                name: toggleVisibilityName,
                encodedValue: toggleVisbilityEncodedValue,
                selected: true
            }
            actions.push(toggleVisibilityAction)
        }

        const subcategoryId = 'token'
        const subcategoryType = 'system'
        const subcategoryData = {
            id: subcategoryId,
            type: subcategoryType
        }

        // Add actions to action list
        this.baseHandler.addActionsToActionList(actions, subcategoryData)
    }

    /**
     * Build utilities for multiple tokens
     */
    _buildMultipleTokenUtilities () {
        const actionType = 'utility'
        const actorId = 'multi'
        const tokenId = 'multi'
        const tokens = canvas.tokens.controlled
        const actions = []

        // Toggle Combat
        const toggleCombatId = 'toggleCombat'
        const inCombat = tokens.every((token) => token.inCombat)
        const toggleCombatName = inCombat
            ? this.baseHandler.i18n('tokenActionHud.removeFromCombat')
            : this.baseHandler.i18n('tokenActionHud.addToCombat')
        const toggleCombatEncodedValue = [
            actionType,
            actorId,
            tokenId,
            toggleCombatId
        ].join(this.baseHandler.delimiter)
        const toggleCombatAction = {
            id: toggleCombatId,
            name: toggleCombatName,
            encodedValue: toggleCombatEncodedValue
        }
        actions.push(toggleCombatAction)

        // Toggle Visibility
        if (game.user.isGM) {
            const toggleVisibilityId = 'toggleVisibility'
            const hidden = tokens.every((token) => !token.document.hidden)
            const toggleVisibilityname = hidden
                ? this.baseHandler.i18n('tokenActionHud.makeVisible')
                : this.baseHandler.i18n('tokenActionHud.makeInvisible')
            const toggleVisbilityEncodedValue = [
                actionType,
                actorId,
                tokenId,
                toggleVisibilityId
            ].join(this.baseHandler.delimiter)
            const toggleVisibilityAction = {
                id: toggleVisibilityId,
                name: toggleVisibilityname,
                encodedValue: toggleVisbilityEncodedValue
            }
            actions.push(toggleVisibilityAction)
        }

        const subcategoryId = 'token'
        const subcategoryType = 'system'
        const subcategoryData = {
            id: subcategoryId,
            type: subcategoryType
        }

        // Add to Action List
        this.baseHandler.addActionsToActionList(actions, subcategoryData)
    }
}
