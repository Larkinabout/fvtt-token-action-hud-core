import { ACTION_TYPE, COMPENDIUM_PACK_TYPES, DELIMITER } from '../constants.js'
import { Utils } from '../utilities/utils.js'

/**
 * Handler for building the HUD's compendium actions.
 */
export class CompendiumActionHandler {
    actionHandler

    constructor (actionHandler) {
        this.actionHandler = actionHandler
        this.categoryManager = actionHandler.categoryManager
    }

    /**
     * Build any compendium actions
     * @override
     */
    async buildCompendiumActions () {
        // Get compendium packs
        const packIds = game.packs
            .filter((pack) => {
                return COMPENDIUM_PACK_TYPES.includes(pack.documentName)
            })
            .filter((pack) => game.user.isGM || !pack.private)
            .map((pack) => pack.metadata.id)

        // Add actions to the action list
        for (const packId of packIds) {
            const subcategoryId = packId.replace('.', '-')
            const subcategoryData = { id: subcategoryId, type: 'core' }
            const actions = await this._getCompendiumActions(packId)
            this.actionHandler.addActionsToActionList(actions, subcategoryData)
        }
    }

    /**
     * Get compendium actions
     * @param {string} packKey The compendium pack key
     * @returns {object}       The actions
     */
    async _getCompendiumActions (packKey) {
        const entries = await this.getCompendiumEntries(packKey)
        const actionType = this.getCompendiumActionType(packKey)
        return entries.map((entry) => {
            const id = entry._id
            const name = entry.name
            const actionTypeName = `${Utils.i18n(ACTION_TYPE[actionType])}: ` ?? ''
            const listName = `${actionTypeName}${name}`
            const encodedValue = [actionType, packKey, entry._id].join(DELIMITER)
            const img = Utils.getImage(entry)
            return {
                id,
                name,
                encodedValue,
                img,
                listName
            }
        })
    }

    /**
     * Get compendium entries
     * @param {string} packKey The compendium pack key
     * @returns                The compendium entries
     */
    async getCompendiumEntries (packKey) {
        const pack = game.packs.get(packKey)
        if (!pack) return []

        const packEntries = pack.index.size > 0 ? pack.index : await pack.getIndex()

        if (pack.documentName === 'Playlist') {
            const entries = await this._getPlaylistEntries(pack)
            return entries
        }

        return packEntries
    }

    /**
     * Get playlist entries
     * @private
     * @param {object} pack The compendium pack
     * @returns {array}     The playlist entries
     */
    async _getPlaylistEntries (pack) {
        const playlists = await pack.getContent()
        return playlists.reduce((acc, playlist) => {
            playlist.sounds.forEach((sound) => {
                acc.push({ _id: `${playlist._id}>${sound._id}`, name: sound.name })
            })
            return acc
        }, [])
    }

    /**
     * Get the compendium action type
     * @param {string} key The compendium pack key
     * @returns {string}   The action type
     */
    getCompendiumActionType (key) {
        const pack = game?.packs?.get(key)
        if (!pack) return ''
        const compendiumEntities = pack.documentName

        switch (compendiumEntities) {
        case 'Macro':
            return 'compendiumMacro'
        case 'Playlist':
            return 'compendiumPlaylist'
        default:
            return 'compendiumEntry'
        }
    }
}
