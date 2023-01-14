import { Logger, getSubcategoryByNestId } from './utilities/utils.js'

const namespace = 'token-action-hud-core'

export class CategoryManager {
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
        await this._registerDefaultCategories()
        Logger.debug('User flags reset')
    }

    /**
     * Initialise saved or default categories
     */
    async init () {
        const savedCategories = this.user.getFlag(namespace, 'categories')
        if (!savedCategories) return this._registerDefaultCategories()
        Logger.debug('Retrieved saved categories', { savedCategories })
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
        await game.user.setFlag(namespace, 'categories', defaultCategories)
        Logger.debug('Registered default categories', { defaultCategories })
    }

    /**
     * Save Categories
     * @param {{object}} choices
     */
    async saveCategories (choices) {
        if (!choices) return
        const categories = game.user.getFlag(namespace, 'categories')
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
                name: choice.name,
                subcategories
            }
        }
        const data = chosenCategories
        if (data) await this.updateCategoriesFlag(data)
    }

    /**
     * Save Subcategories
     * @param {string} categoryId
     * @param {object} choices
     */
    async saveSubcategories (choices, advancedCategoryOptions = null, subcategoryData) {
        if (!choices) return
        const categories = game.user.getFlag(namespace, 'categories')
        const categorySubcategory = await getSubcategoryByNestId(Object.values(categories), subcategoryData)
        if (!categorySubcategory) return

        const nestId = subcategoryData.nestId

        const chosenSubcategories = {}
        for (const choice of choices) {
            const subcategoryKey = `${nestId}_${choice.id}`
            chosenSubcategories[subcategoryKey] = choice
        }

        // Add advanced category options
        if (advancedCategoryOptions) categorySubcategory.advancedCategoryOptions = advancedCategoryOptions

        // Assign subcategories
        categorySubcategory.subcategories = chosenSubcategories

        const data = categories
        if (data) await this.updateCategoriesFlag(data)
    }

    /**
     * Update categories flag
     * @param {object} data
     */
    async updateCategoriesFlag (data) {
        await game.user.unsetFlag(namespace, 'categories')
        await game.user.setFlag(namespace, 'categories', data)
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

    async getSelectedSubcategoriesAsTagifyEntries (subcategoryData) {
        const categories = this.user.getFlag(namespace, 'categories')
        if (!categories) return []
        const subcategory = await getSubcategoryByNestId(Object.values(categories), subcategoryData)
        if (!subcategory) return []
        if (!subcategory.subcategories) return []

        const subcategories = Object.values(subcategory.subcategories).map(
            (subcategory) => this.toTagifyEntry(subcategory)
        )
        if (subcategories) return subcategories
        return []
    }

    // GET SUGGESTED SUBCATEGORIES
    getSubcategoriesAsTagifyEntries () {
        const systemSubcategories = this.getSystemSubcategoriesAsTagifyEntries()
        const compendiumSubcategories = this.getCompendiumSubcategoriesAsTagifyEntries()
        const subcategories = []
        subcategories.push(...systemSubcategories, ...compendiumSubcategories)
        return subcategories
    }

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
                return { id, value, type: 'compendium', level: 'subcategory' }
            })
    }

    // OTHER
    isLinkedCompendium (id) {
        return this.categories.some((c) =>
            c.subcategories?.some((c) => c.compendiumId === id)
        )
    }

    toTagifyEntry (data) {
        const id = data.id
        const value = data.name
        const type = data.type
        const level = 'subcategory'
        return { id, value, type, level }
    }
}
