import { MODULE } from './constants.js'
import { Logger, Utils } from './utilities/utils.js'

/**
 * Manages migrations between module versions
 */
export class MigrationManager {
    constructor (systemModuleId) {
        this.systemModuleId = systemModuleId
    }

    /**
     * Initialise migrations
     * @public
     */
    async init () {
        await this._migrateGroups()
    }

    /**
     * Migrate user flags
     * @private
     */
    async _migrateGroups () {
        if (!Utils.getUserFlag('categories')) return
        try {
            if (Utils.getUserFlag('default')) {
                Utils.unsetUserFlag('default')
            }
            const categories = Utils.getUserFlag('categories')
            if (categories) {
                const groups = Utils.getSubcategories(categories)
                if (Object.keys(groups).length) {
                    const userGroups = {}
                    for (const group of Object.values(groups)) {
                        if (group.type !== 'system-derived') {
                            const groupClone = Utils.deepClone(group)
                            if (Object.hasOwn(groupClone, 'actions')) delete groupClone.actions
                            if (Object.hasOwn(groupClone, 'subcategories')) delete groupClone.subcategories
                            if (Object.hasOwn(groupClone, 'hasDerivedSubcategories')) delete groupClone.hasDerivedSubcategories
                            if (Object.hasOwn(groupClone, 'advancedCategoryOptions')) {
                                groupClone.settings = groupClone.advancedCategoryOptions
                                delete groupClone.advancedCategoryOptions
                            }
                            userGroups[groupClone.nestId] = groupClone
                        }
                    }
                    await Utils.unsetUserFlag('groups')
                    await Utils.setUserFlag('groups', userGroups)
                }

                const actors = game.actors.filter(actor => actor.getFlag(MODULE.ID, 'categories'))
                if (actors) {
                    for (const actor of actors) {
                        const categories = actor.getFlag(MODULE.ID, 'categories')
                        const groups = Utils.getSubcategories(categories)
                        if (Object.keys(groups).length) {
                            const actorGroups = {}
                            for (const group of Object.values(groups)) {
                                const groupClone = Utils.deepClone(group)
                                if (Object.hasOwn(groupClone, 'subcategories')) delete groupClone.subcategories
                                if (Object.hasOwn(groupClone, 'hasDerivedSubcategories')) delete groupClone.hasDerivedSubcategories
                                if (Object.hasOwn(groupClone, 'advancedCategoryOptions')) {
                                    groupClone.settings = groupClone.advancedCategoryOptions
                                    delete groupClone.advancedCategoryOptions
                                }
                                actorGroups[groupClone.nestId] = groupClone
                            }
                            await actor.unsetFlag(MODULE.ID, 'groups')
                            await actor.setFlag(MODULE.ID, 'groups', actorGroups)
                            if (actor.getFlag(MODULE.ID, 'groups')) {
                                actor.unsetFlag(MODULE.ID, 'categories')
                            }
                        }
                    }
                }

                const tokens = game.canvas.tokens.objects.children.filter(token => token.actor?.getFlag(MODULE.ID, 'categories'))
                if (tokens) {
                    for (const token of tokens) {
                        const categories = token.actor.getFlag(MODULE.ID, 'categories')
                        const groups = Utils.getSubcategories(categories)
                        if (Object.keys(groups).length) {
                            const actorGroups = {}
                            for (const group of Object.values(groups)) {
                                const groupClone = Utils.deepClone(group)
                                if (Object.hasOwn(groupClone, 'subcategories')) delete groupClone.subcategories
                                if (Object.hasOwn(groupClone, 'hasDerivedSubcategories')) delete groupClone.hasDerivedSubcategories
                                if (Object.hasOwn(groupClone, 'advancedCategoryOptions')) {
                                    groupClone.settings = groupClone.advancedCategoryOptions
                                    delete groupClone.advancedCategoryOptions
                                }
                                actorGroups[groupClone.nestId] = groupClone
                            }
                            await token.actor.unsetFlag(MODULE.ID, 'groups')
                            await token.actor.setFlag(MODULE.ID, 'groups', actorGroups)
                            if (token.actor.getFlag(MODULE.ID, 'groups')) {
                                token.actor.unsetFlag(MODULE.ID, 'categories')
                            }
                        }
                    }
                }

                if (Utils.getUserFlag('groups')) {
                    Utils.unsetUserFlag('categories')
                }
            }

            Logger.info('Successfully migrated flags', true)
        } catch (err) {
            Logger.error('Failed to migrate flags', true)
            Logger.debug(err.message, err)
        }
    }
}
