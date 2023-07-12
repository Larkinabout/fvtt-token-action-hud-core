import { ACTION_TYPE, COMPENDIUM_PACK_TYPES, DELIMITER } from '../constants.js'
import { Utils } from '../utils.js'

/**
 * Handler for building the HUD's compendium actions.
 */
export class CompendiumActionHandler {
    actionHandler

    constructor (actionHandler) {
        this.actionHandler = actionHandler
    }

    /**
     * Build compendium actions
     * @override
     */
    async buildCompendiumActions () {
        // Get compendium packs
        const packIds = game.packs
            .filter(pack => 
                COMPENDIUM_PACK_TYPES.includes(pack.documentName) &&
                (game.version.startsWith('11') ? pack.visible : (!pack.private || game.user.isGM)))
            .map(pack => pack.metadata.id)

        for (const packId of packIds) {
            const actionsData = await this._getCompendiumActions(packId)
            const groupData = { id: packId.replace('.', '-'), type: 'core' }
            this.actionHandler.addActions(actionsData, groupData)
        }
    }

    /**
     * Get compendium actions
     * @private
     * @param {string} packKey The compendium pack key
     * @returns {object}       The actions
     */
    async _getCompendiumActions (packKey) {
        const entries = await this._getCompendiumEntries(packKey)
        const actionType = this._getCompendiumActionType(packKey)
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
     * @private
     * @param {string} packKey The compendium pack key
     * @returns                The compendium entries
     */
    async _getCompendiumEntries (packKey) {
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
     * @private
     * @param {string} key The compendium pack key
     * @returns {string}   The action type
     */
    _getCompendiumActionType (key) {
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
