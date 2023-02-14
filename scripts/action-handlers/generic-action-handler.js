import { ACTION_TYPE, DELIMITER, SUBCATEGORY_TYPE } from '../constants.js'
import { Utils } from '../utilities/utils.js'

/**
 * Handler for building the HUD's generic actions.
 */
export class GenericActionHandler {
    actionHandler

    constructor (actionHandler) {
        this.actionHandler = actionHandler
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
        if (character) return this._buildSingleTokenUtilities(character)
        this._buildMultipleTokenUtilities()
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
        const actions = []

        const actionType = 'utility'

        // Build Toggle Combat action
        const toggleCombatId = 'toggleCombat'
        const inCombat = canvas.tokens.placeables.find(
            (token) => token.id === tokenId
        ).inCombat
        const toggleCombatName = inCombat
            ? Utils.i18n('tokenActionHud.removeFromCombat')
            : Utils.i18n('tokenActionHud.addToCombat')
        const toggleCombatEncodedValue = [
            actionType,
            actorId,
            tokenId,
            toggleCombatId
        ].join(DELIMITER)
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
                ? Utils.i18n('tokenActionHud.makeVisible')
                : Utils.i18n('tokenActionHud.makeInvisible')
            const toggleVisbilityEncodedValue = [
                actionType,
                actorId,
                tokenId,
                toggleVisibilityId
            ].join(DELIMITER)
            const toggleVisibilityAction = {
                id: toggleVisibilityId,
                name: toggleVisibilityName,
                encodedValue: toggleVisbilityEncodedValue,
                selected: true
            }
            actions.push(toggleVisibilityAction)
        }

        const subcategoryId = 'token'
        const subcategoryData = { id: subcategoryId, type: SUBCATEGORY_TYPE.SYSTEM }

        // Add actions to action list
        this.actionHandler.addActionsToActionList(actions, subcategoryData)
    }

    /**
     * Build utilities for multiple tokens
     */
    _buildMultipleTokenUtilities () {
        const actorId = 'multi'
        const tokenId = 'multi'
        const tokens = Utils.getControlledTokens()
        const actions = []

        const actionType = 'utility'

        // Toggle Combat
        const toggleCombatId = 'toggleCombat'
        const inCombat = tokens.every((token) => token.inCombat)
        const toggleCombatName = inCombat
            ? Utils.i18n('tokenActionHud.removeFromCombat')
            : Utils.i18n('tokenActionHud.addToCombat')
        const toggleCombatEncodedValue = [actionType, actorId, tokenId, toggleCombatId].join(DELIMITER)
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
                ? Utils.i18n('tokenActionHud.makeVisible')
                : Utils.i18n('tokenActionHud.makeInvisible')
            const toggleVisbilityEncodedValue = [actionType, actorId, tokenId, toggleVisibilityId].join(DELIMITER)
            const toggleVisibilityAction = {
                id: toggleVisibilityId,
                name: toggleVisibilityname,
                encodedValue: toggleVisbilityEncodedValue
            }
            actions.push(toggleVisibilityAction)
        }

        const subcategoryId = 'token'
        const subcategoryData = { id: subcategoryId, type: SUBCATEGORY_TYPE.SYSTEM }

        // Add to Action List
        this.actionHandler.addActionsToActionList(actions, subcategoryData)
    }
}
