import Logger from './logger.js'

const namespace = 'token-action-hud-core'

export default class CategoryManager {
    i18n = (toTranslate) => game.i18n.localize(toTranslate)

    categories = []
    user = null

    constructor (user) {
        this.user = user
    }

    /**
     * Reset actor flags
     */
    async resetActorFlags () {
        Logger.debug('Resetting actor flags...')
        const actors = game.actors.filter(actor => actor.getFlag(namespace, 'categories'))
        if (actors) {
            actors.forEach(actor => {
                Logger.debug(`Resetting flags for actor [${actor.id}]`, { actor })
                actor.unsetFlag(namespace, 'categories')
            })
        }
        Logger.debug('Actor flags reset')
    }

    /**
     * Reset user flags
     */
    async resetUserFlags () {
        Logger.debug('Resetting user flags...')
        await game.user.unsetFlag(namespace, 'categories')
        Logger.debug('User flags reset')
        this._registerDefaultCategories()
    }

    /**
     * Initialise saved or default categories
     */
    async init () {
        const savedCategories = this.user.getFlag(namespace, 'categories')
        if (savedCategories) {
            Logger.debug('Retrieved saved categories', { savedCategories })
        } else {
            this._registerDefaultCategories()
        }
    }

    /**
     * Register default categories
     */
    async _registerDefaultCategories () {
        const defaultCategories = this.user.getFlag(
            namespace,
            'default.categories'
        )
        if (!defaultCategories) return
        await game.user.update({
            flags: { [namespace]: { categories: defaultCategories } }
        })
        Logger.debug('Registered default categories', { defaultCategories })
    }

    /**
     * Submit Categories
     * @param {{object}} choices
     */
    async submitCategories (choices) {
        if (!choices) return
        const categories = this.user.getFlag(namespace, 'categories')
        if (categories) await this.deleteCategoriesFlag()

        const chosenCategories = {}
        for (const choice of choices) {
            const categoryKey = choice.id
            const category = Object.values(categories).find(
                (c) => c.id === categoryKey
            )
            const subcategories = category?.subcategories ?? null
            chosenCategories[categoryKey] = {
                id: choice.id,
                title: choice.title,
                subcategories
            }
        }
        const data = chosenCategories
        if (data) await this.updateCategoriesFlag(data)
    }

    /**
     * Submit Subcategories
     * @param {string} categoryId
     * @param {object} choices
     */
    async submitSubcategories (categoryId, choices) {
        const categories = this.user.getFlag(namespace, 'categories')
        const category = Object.values(categories).find(
            (category) => category.id === categoryId
        )
        if (!category) return

        const categoryKey = categoryId
        if (category.subcategories) await this.deleteSubcategoriesFlag(categoryKey)

        if (!choices) return

        const chosenSubcategories = {}
        for (const choice of choices) {
            const subcategoryKey = `${categoryId}_${choice.id}`
            chosenSubcategories[subcategoryKey] = choice
        }
        const data = chosenSubcategories
        await this.updateSubcategoriesFlag(categoryKey, data)
    }

    /**
     * Update categories flag
     * @param {object} data
     */
    async updateCategoriesFlag (data) {
        await game.user.update({
            flags: {
                [namespace]: {
                    categories: data
                }
            }
        })
    }

    /**
     * Update subcategories flag
     * @param {*} categoryKey 
     * @param {*} data 
     */
    async updateSubcategoriesFlag (categoryKey, data) {
        await game.user.update({
            flags: {
                [namespace]: {
                    categories: {
                        [categoryKey]: {
                            subcategories: data
                        }
                    }
                }
            }
        })
    }

    /**
     * Delete categories flag
     */
    async deleteCategoriesFlag () {
        await game.user.update({
            flags: {
                [namespace]: {
                    '-=categories': null
                }
            }
        })
    }

    /**
     * Delete subcategories flag
     * @param {string} categoryKey
     */
    async deleteSubcategoriesFlag (categoryKey) {
        await game.user.update({
            flags: {
                [namespace]: {
                    categories: {
                        [categoryKey]: {
                            '-=subcategories': null
                        }
                    }
                }
            }
        })
    }

    /**
     * Delete category flag
     * @param {string} categoryId
     */
    async deleteCategoryFlag (categoryId) {
        const categoryKey = categoryId
        await game.user.setFlag(namespace, 'categories', {
            [`-=${categoryKey}`]: null
        })
    }

    /**
     * Delete subcategories flag
     */
    async deleteSubcategoryFlag (categoryId, subcategoryId) {
        const categoryKey = categoryId
        const subcategoryKey = `${categoryId}_${subcategoryId}`
        if (categoryKey) {
            await game.user.setFlag(
                [namespace],
                `categories.${categoryKey}.subcategories`,
                { [`-=${subcategoryKey}`]: null }
            )
        }
    }

    // GET CATEGORIES/SUBCATEGORIES
    // GET SELECTED SUBCATEGORIES
    getSelectedCategoriesAsTagifyEntries () {
        const categories = this.user.getFlag(namespace, 'categories')
        if (!categories) return
        return Object.values(categories).map((category) =>
            this.toTagifyEntry(category)
        )
    }

    getSelectedSubcategoriesAsTagifyEntries (categoryId) {
        const categories = this.user.getFlag(namespace, 'categories')
        const category = Object.values(categories).find(
            (category) => category.id === categoryId
        )
        if (!category.subcategories) return
        const subcategories = Object.values(category.subcategories).map(
            (subcategory) => this.toTagifyEntry(subcategory)
        )
        return subcategories
    }

    // GET SUGGESTED SUBCATEGORIES
    getSystemSubcategoriesAsTagifyEntries () {
        const defaultSubcategories = this.user.getFlag(
            namespace,
            'default.subcategories'
        )
        return defaultSubcategories.map((subcategory) => this.toTagifyEntry(subcategory))
    }

    getCompendiumSubcategoriesAsTagifyEntries () {
        const packs = game.packs
        return packs
            .filter((pack) => {
                const packTypes = ['JournalEntry', 'Macro', 'RollTable', 'Playlist']
                return packTypes.includes(pack.documentName)
            })
            .filter((pack) => game.user.isGM || !pack.private)
            .map((pack) => {
                const id = pack.metadata.id.replace('.', '-')
                const value = pack.metadata.label
                return { id, value, type: 'compendium' }
            })
    }

    // OTHER
    isLinkedCompendium (id) {
        return this.categories.some((c) =>
            c.subcategories?.some((c) => c.compendiumId === id)
        )
    }

    toTagifyEntry (data) {
        return { id: data.id, value: data.title, type: data.type }
    }
}
