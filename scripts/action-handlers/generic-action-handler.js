export class GenericActionHandler {
    baseHandler

    constructor (baseHandler) {
        this.baseHandler = baseHandler
    }

    /**
     * Build generic actions
     * @param {object} actionList The action list
     * @param {object} character The actor and/or token
     */
    buildGenericActions (actionList, character) {
        this._buildConditions(actionList, character)
        this._buildUtilities(actionList, character)
    }

    /**
     * Build conditions
     * @private
     * @param {object} actionList The action list
     * @param {object} character The actor and/or token
     */
    _buildConditions (actionList, character) {}

    /**
     * Build utilities
     * @private
     * @param {object} actionList The action list
     * @param {object} character The actor and/or token
     */
    _buildUtilities (actionList, character) {
        if (character) {
            this._buildSingleTokenUtilities(actionList, character)
        } else {
            this._buildMultipleTokenUtilities(actionList)
        }
    }

    /**
     * Build utilities for a single token
     * @private
     * @param {object} actionList The action list
     * @param {object} character The actor and/or token
     */
    _buildSingleTokenUtilities (actionList, character) {
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

        // Add actions to action list
        this.baseHandler.addActionsToActionList(actionList, actions, 'token')
    }

    /**
     * Build utilities for multiple tokens
     * @param {object} actionList The action list
     */
    _buildMultipleTokenUtilities (actionList) {
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

        // Add to Action List
        this.baseHandler.addActionsToActionList(actionList, actions, 'token')
    }
}
