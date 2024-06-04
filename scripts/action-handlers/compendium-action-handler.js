import { ACTION_TYPE, COMPENDIUM_PACK_TYPES, DELIMITER } from '../constants.js'
import { Utils } from '../utils.js'

/**
 * Handler for building the HUD's compendium actions.
 */
export class CompendiumActionHandler {
    actionHandler
    compendiumActions
    packIds

    constructor (actionHandler) {
        this.actionHandler = actionHandler
        this.compendiumActions = new Map()
        this.packIds = []
    }

    /**
     * Build compendium actions
     */
    async buildCompendiumActions () {
        if (this.compendiumActions.size === 0) {
            this.packIds = game.packs
                .filter(
                    (pack) =>
                        COMPENDIUM_PACK_TYPES.includes(pack.documentName) &&
              (foundry.utils.isNewerVersion(game.version, '10') ? pack.visible : !pack.private || game.user.isGM)
                )
                .map((pack) => pack.metadata.id)

            if (this.packIds.length === 0) return

            await Promise.all(this.packIds.map(packId => this.#setCompendiumActions(packId)))
        }

        for (const pack of this.compendiumActions.values()) {
            this.actionHandler.addActions(pack.actionsData, pack.groupData)
        }
    }

    /**
     * Set compendium actions into the compendiumActions map
     * @param {string} packId The pack id
     */
    async #setCompendiumActions (packId) {
        const pack = game.packs.get(packId)
        const entries = pack ? pack.index.size > 0 ? pack.index : await pack.getIndex() : null
        if (!entries) return
        const actionType = this.#getCompendiumActionType(pack?.documentName)
        const actionsData = entries.map((entry) => ({
            id: entry._id,
            name: entry.name,
            encodedValue: [actionType, packId, entry._id].join(DELIMITER),
            img: Utils.getImage(entry),
            listName: `${Utils.i18n(ACTION_TYPE[actionType])}: ${entry.name}`
        }))
        const groupData = { id: this.#getGroupId(packId), type: 'core' }
        this.compendiumActions.set(packId, { actionsData, groupData })
    }

    /**
     * Get compendium action type based on documentName
     * @param {string} documentName The pack document name
     * @returns {string}            The compendium action type
     */
    #getCompendiumActionType (documentName) {
        switch (documentName) {
        case 'Macro':
            return 'compendiumMacro'
        case 'Playlist':
            return 'compendiumPlaylist'
        default:
            return 'compendiumEntry'
        }
    }

    /**
     * @param {string} packId The pack id
     * @returns {string}      The group id
     */
    #getGroupId (packId) {
        return packId.replace('.', '-')
    }

    /**
     * Whether the compendium is linked
     * @public
     * @param {string} packId The pack id
     * @returns {boolean}     Whether the compendium is linked
     */
    isLinkedCompendium (packId) {
        return (this.packIds.length)
            ? this.packIds?.includes(packId)
            : false
    }
}
