import { DELIMITER, GROUP_TYPE } from '../constants.js'
import { Utils } from '../utils.js'

/**
 * Handler for building the HUD's generic actions.
 */
export class GenericActionHandler {
    actionHandler

    constructor (actionHandler) {
        this.actionHandler = actionHandler
        this.actor = actionHandler.actor
        this.token = actionHandler.token
    }

    /**
     * Build generic actions
     * @public
     * @param {object} character The actor and/or token
     */
    buildGenericActions () {
        this.#buildUtilities()
    }

    /**
     * Build utilities
     * @private
     */
    #buildUtilities () {
        if (this.actor) return this.#buildSingleTokenUtilities()
        this.#buildMultipleTokenUtilities()
    }

    /**
     * Build utilities for a single token
     * @private
     */
    #buildSingleTokenUtilities () {
        if (!this.token) return
        const actionsData = []

        const actionType = 'utility'

        // Build Toggle Combat action
        const toggleCombatId = 'toggleCombat'
        const toggleCombatName = this.token?.inCombat
            ? Utils.i18n('tokenActionHud.removeFromCombat')
            : Utils.i18n('tokenActionHud.addToCombat')
        const toggleCombatEncodedValue = [
            actionType,
            toggleCombatId
        ].join(DELIMITER)
        const toggleCombatAction = {
            id: toggleCombatId,
            name: toggleCombatName,
            encodedValue: toggleCombatEncodedValue
        }
        actionsData.push(toggleCombatAction)

        // Build Toggle Visibility action
        if (game.user.isGM) {
            const toggleVisibilityId = 'toggleVisibility'
            const toggleVisibilityName = this.token?.document?.hidden
                ? Utils.i18n('tokenActionHud.makeVisible')
                : Utils.i18n('tokenActionHud.makeInvisible')
            const toggleVisbilityEncodedValue = [
                actionType,
                toggleVisibilityId
            ].join(DELIMITER)
            const toggleVisibilityAction = {
                id: toggleVisibilityId,
                name: toggleVisibilityName,
                encodedValue: toggleVisbilityEncodedValue
            }
            actionsData.push(toggleVisibilityAction)
        }

        const groupData = { id: 'token', type: GROUP_TYPE.SYSTEM }

        // Add actions to HUD
        this.actionHandler.addActions(actionsData, groupData)
    }

    /**
     * Build utilities for multiple tokens
     * @private
     */
    #buildMultipleTokenUtilities () {
        const tokens = Utils.getControlledTokens()
        const actionsData = []

        const actionType = 'utility'

        // Toggle Combat
        const toggleCombatId = 'toggleCombat'
        const toggleCombatName = tokens.every((token) => token.inCombat)
            ? Utils.i18n('tokenActionHud.removeFromCombat')
            : Utils.i18n('tokenActionHud.addToCombat')
        const toggleCombatEncodedValue = [actionType, toggleCombatId].join(DELIMITER)
        const toggleCombatAction = {
            id: toggleCombatId,
            name: toggleCombatName,
            encodedValue: toggleCombatEncodedValue
        }
        actionsData.push(toggleCombatAction)

        // Toggle Visibility
        if (game.user.isGM) {
            const toggleVisibilityId = 'toggleVisibility'
            const toggleVisibilityname = tokens.every((token) => token.document?.hidden)
                ? Utils.i18n('tokenActionHud.makeVisible')
                : Utils.i18n('tokenActionHud.makeInvisible')
            const toggleVisbilityEncodedValue = [actionType, toggleVisibilityId].join(DELIMITER)
            const toggleVisibilityAction = {
                id: toggleVisibilityId,
                name: toggleVisibilityname,
                encodedValue: toggleVisbilityEncodedValue
            }
            actionsData.push(toggleVisibilityAction)
        }

        const groupData = { id: 'token', type: GROUP_TYPE.SYSTEM }

        // Add actions to HUD
        this.actionHandler.addActions(actionsData, groupData)
    }
}
