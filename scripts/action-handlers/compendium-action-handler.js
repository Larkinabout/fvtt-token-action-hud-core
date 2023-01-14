export class CompendiumActionHandler {
    baseHandler

    constructor (baseHandler) {
        this.baseHandler = baseHandler
    }

    /**
     * Build any compendium actions
     * @override
     */
    async buildCompendiumActions () {
        // Get compendium subcategories
        const subcategories = this.baseHandler.getFlattenedSubcategories({ subcategoryType: 'compendium' })
        const subcategoryIds = subcategories.flatMap(subcategory => subcategory.id)

        if (!subcategoryIds) return

        // Get compendium packs
        const packIds = game.packs
            .filter((pack) => {
                const packTypes = ['JournalEntry', 'Macro', 'RollTable', 'Playlist']
                return packTypes.includes(pack.documentName)
            })
            .filter((pack) => game.user.isGM || !pack.private)
            .map((pack) => pack.metadata.id)

        // Add actions to the action list
        for (const packId of packIds) {
            const subcategoryId = packId.replace('.', '-')
            if (subcategoryIds.includes(packId.replace('.', '-'))) {
                const actions = await this.getCompendiumActions(packId)
                this.baseHandler.addActionsToActionList(actions, subcategoryId)
            }
        }
    }

    /**
     * Get compendium actions
     * @param {string} packKey The compendium pack key
     * @returns {object} The actions
     */
    async getCompendiumActions (packKey) {
        const entries = await this.getCompendiumEntries(packKey)
        const actionType = this.getCompendiumActionType(packKey)
        return entries.map((entry) => {
            const id = entry._id
            const name = entry.name
            const encodedValue = [actionType, packKey, entry._id].join(
                this.baseHandler.delimiter
            )
            const img = this.baseHandler.getImage(entry)
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

    /**
     * Get compendium entries
     * @param {string} packKey The compendium pack key
     * @returns The compendium entries
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
     * @returns {array} The playlist entries
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
     * @returns {string} The action type
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
