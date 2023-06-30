import { MODULE } from './constants.js'
import { Logger, Utils } from './utilities/utils.js'

/**
 * Manages migrations between module versions
 */
export class MigrationManager {
    constructor (socket) {
        this.socket = socket
    }

    /**
     * Initialise migrations
     * @public
     */
    async init () {
        if (!game.user.isGM) return

        const migrationVersion = '1.4.10'
        if (Utils.getSetting('migrationVersion') === migrationVersion) return

        let isSuccess = true
        isSuccess = await this.#unsetOldFlags()

        if (isSuccess) {
            Utils.setSetting('migrationVersion', migrationVersion)
        }
    }

    /**
     * Unset old flags
     * @private
     */
    async #unsetOldFlags () {
        try {
            const users = game.users.filter(user => user.getFlag(MODULE.ID, 'categories'))
            for (const user of users) {
                user.unsetFlag(MODULE.ID, 'categories')
                user.unsetFlag(MODULE.ID, 'defaults')
            }

            const actors = game.actors.filter(actor => actor.getFlag(MODULE.ID, 'categories'))
            for (const actor of actors) {
                actor.unsetFlag(MODULE.ID, 'categories')
            }

            const tokens = game.canvas.tokens.objects.children.filter(token => token.actor?.getFlag(MODULE.ID, 'categories'))
            for (const token of tokens) {
                token.actor?.unsetFlag(MODULE.ID, 'categories')
            }

            for (const scene of game.scenes) {
                const tokens = scene.tokens.filter(token => token.actor?.getFlag(MODULE.ID, 'categories'))
                for (const token of tokens) {
                    token.actor?.unsetFlag(MODULE.ID, 'categories')
                }
            }

            return true
        } catch (err) {
            Logger.debug(err.message, err)

            return false
        }
    }
}
