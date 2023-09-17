import { MODULE } from './constants.js'
import { isPersistentStorage, DataHandler } from './data-handler.js'
import { Logger, Utils } from './utils.js'

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

        const moduleVersion = game.modules.get('token-action-hud-core').version
        const migrationVersion = Utils.getSetting('migrationVersion')
        if (moduleVersion === migrationVersion) return

        let isSuccess = true
        isSuccess = (!migrationVersion || migrationVersion < '1.4.10') ? await this.#unsetOldFlags() : true
        isSuccess = (isPersistentStorage() && (!migrationVersion || migrationVersion < '1.4.11')) ? await this.#migrateFiles() : true

        if (isSuccess) {
            Utils.setSetting('migrationVersion', moduleVersion)
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

    async #migrateFiles () {
        try {
            Logger.info('Migrating files to persistent storage...', true)
            for (const user of game.users) {
                const data = await DataHandler.getDataMigrate('user', user.id)
                if (data) {
                    await DataHandler.saveData('user', user.id, data)
                }
            }

            for (const actor of game.actors) {
                const data = await DataHandler.getDataMigrate('actor', actor.id)
                if (data) {
                    await DataHandler.saveData('actor', actor.id, data)
                }
            }
            Logger.info('Successfully migrated files to persistent storage', true)
            return true
        } catch {
            Logger.info('Failed to migrate files to persistent storage', true)
            return false
        }
    }
}
