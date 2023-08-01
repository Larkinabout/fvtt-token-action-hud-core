import { PreRollHandler } from './pre-roll-handler.js'
import { COMPENDIUM_ACTION_TYPES, DELIMITER } from '../constants.js'

export class CompendiumMacroPreHandler extends PreRollHandler {
    /** @override */
    prehandleActionEvent (event, encodedValue) {
        const payload = encodedValue.split(DELIMITER)

        if (payload.length < 2) return false

        let actionType = null
        let key = null
        let actionId = null

        if (payload.length === 2) {
            actionType = payload[0]
            actionId = payload[1]
        }
        if (payload.length === 3) {
            actionType = payload[0]
            key = payload[1]
            actionId = payload[2]
        }

        if (!COMPENDIUM_ACTION_TYPES.includes(actionType)) return false

        switch (actionType) {
        case 'compendiumEntry':
            this.#handleCompendium(key, actionId)
            break
        case 'compendiumMacro':
            this.#handleMacroCompendium(key, actionId)
            break
        case 'compendiumPlaylist':
            this.#handlePlaylistCompendium(key, actionId)
            break
        case 'macro':
            this.#handleMacro(actionId)
            break
        default:
            return false
        }

        return true
    }

    /**
     * Handle compendium
     * @private
     * @param {string} compendiumKey The compendium key
     * @param {string} actionId      The action id
     */
    #handleCompendium (compendiumKey, actionId) {
        const pack = game.packs.get(compendiumKey)
        pack.getDocument(actionId).then((entity) => entity.sheet.render(true))
    }

    /**
     * Handle macro compendium
     * @private
     * @param {string} compendiumKey The compendium key
     * @param {string} actionId      The action id
     */
    #handleMacroCompendium (compendiumKey, actionId) {
        const pack = game.packs.get(compendiumKey)
        pack.getDocument(actionId).then((entity) => entity.execute())
    }

    /**
     * Handle playlist compendium
     * @private
     * @param {string} compendiumKey The compendium key
     * @param {string} actionId      The action id
     */
    async #handlePlaylistCompendium (compendiumKey, actionId) {
        const pack = game.packs.get(compendiumKey)
        const actionPayload = actionId.split('>')
        const playlistId = actionPayload[0]
        const soundId = actionPayload[1]
        const playlist = await pack.getDocument(playlistId)
        const sound = playlist.sounds.find((sound) => sound._id === soundId)
        AudioHelper.play({ src: sound.path }, {})
    }

    /**
     * Handle macro
     * @private
     * @param {string} actionId The action id
     */
    #handleMacro (actionId) {
        game.macros.get(actionId).execute()
    }
}
