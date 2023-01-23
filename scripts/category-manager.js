import { Logger, getSubcategories, getSubcategoryByNestId } from './utilities/utils.js'

const namespace = 'token-action-hud-core'

export class CategoryManager {
    i18n = (toTranslate) => game.i18n.localize(toTranslate)

    categories = []

    constructor () {
        this.flattenedSubcategories = []
        this.derivedSubcategories = new Map()
    }

    /**
     * Reset CategoryManager
     */
    async resetCategoryManager () {
        this.flattenedSubcategories = []
        this.derivedSubcategories = new Map()
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
        this.resetCategoryManager()
        await this._registerDefaultCategories()
        Logger.debug('User flags reset')
    }

    /**
     * Initialise saved or default categories
     */
    async init () {
        const savedCategories = game.user.getFlag(namespace, 'categories')
        if (!savedCategories) return this._registerDefaultCategories()
        Logger.debug('Retrieved saved categories', { savedCategories })
    }

    /**
     * Register default categories
     */
    async _registerDefaultCategories () {
        const defaultCategories = game.user.getFlag(namespace, 'default.categories')
        if (!defaultCategories) return
        await game.user.setFlag(namespace, 'categories', defaultCategories)
        Logger.debug('Registered default categories', { defaultCategories })
    }

    /**
     * Create category
     * @param {object} categoryData The category data
     * @returns {object} The category
     */
    createCategory (categoryData) {
        const categoryDataClone = deepClone(categoryData)
        return {
            id: categoryDataClone?.id,
            nestId: categoryDataClone?.nestId ?? this.id,
            name: categoryDataClone?.name,
            level: 'category',
            advancedCategoryOptions: categoryDataClone?.advancedCategoryOptions ?? {},
            cssClass: '',
            subcategories: []
        }
    }

    /**
     * Create subcategory
     * @param {object} subcategoryData The subcategory data
     * @returns {object} The subcategory
     */
    createSubcategory (subcategoryData) {
        const subcategoryDataClone = deepClone(subcategoryData)
        return {
            id: subcategoryDataClone?.id,
            nestId: subcategoryDataClone?.nestId,
            name: subcategoryDataClone?.name,
            type: subcategoryDataClone?.type ?? 'custom',
            level: 'subcategory',
            advancedCategoryOptions: subcategoryDataClone?.advancedCategoryOptions ?? {},
            hasDerivedSubcategories: subcategoryDataClone?.hasDerivedSubcategories ?? false,
            isSelected: subcategoryDataClone.isSelected ?? true,
            info1: subcategoryDataClone?.info1 ?? '',
            info2: subcategoryDataClone?.info2 ?? '',
            info3: subcategoryDataClone?.info3 ?? '',
            actions: [],
            subcategories: []
        }
    }

    /**
     * Flatten subcategories for easy retrieval
     * @param {object} actionList The action list
     */
    flattenSubcategories (actionList) {
        this.flattenedSubcategories = getSubcategories(actionList.categories)
    }

    /**
     * Get flattened subcategories by search criteria
     * @param {object={}} searchCriteria The search criteria
     * @returns {array} The matching flattened subcategories
     */
    getFlattenedSubcategories (searchCriteria = {}) {
        const subcategoryId = searchCriteria.id
        const subcategoryNestId = searchCriteria.nestId
        const subcategoryType = searchCriteria.type
        const subcategoryLevel = searchCriteria.level
        return this.flattenedSubcategories.filter(
            subcategory =>
                (!subcategoryId || subcategory.id === subcategoryId) &&
                (!subcategoryNestId || subcategory.nestId.startsWith(subcategoryNestId)) &&
                (!subcategoryType || subcategory.type === subcategoryType) &&
                (!subcategoryLevel || subcategory.level === subcategoryLevel)
        )
    }

    /**
     * Add a subcategory to the flattenedSubcategories array
     * @public
     * @param {object} subcategoryData The subcategory data
     */
    addToFlattenedSubcategories (subcategoryData) {
        const matchingSubcategory = this.getFlattenedSubcategories(subcategoryData)
        if (matchingSubcategory.length > 0) return
        this.flattenedSubcategories.push(subcategoryData)
    }

    /**
     * Save categories to the user action list
     * @param {object} choices
     */
    async saveCategories (choices) {
        if (!choices) return
        const categories = game.tokenActionHud.actionHandler.actionList.categories

        const chosenCategories = []
        for (const choice of choices) {
            const categoryNestId = choice.id
            const category = categories.find(category => category.nestId === categoryNestId)
            const subcategories = deepClone(category?.subcategories) ?? null
            chosenCategories.push({
                nestId: choice.id,
                id: choice.id,
                name: choice.name,
                subcategories
            })
        }

        if (chosenCategories) await this.saveUserActionList(chosenCategories)
    }

    /**
     * Save subcategories to the user action list
     * @param {string} categoryId
     * @param {object} choices
     */
    async saveSubcategories (choices, advancedCategoryOptions = null, subcategoryData) {
        // Exit if no choices exist
        if (!choices) return

        Logger.debug('Saving subcategories...', { choices, advancedCategoryOptions, subcategoryData })

        const categories = game.tokenActionHud.actionHandler.actionList.categories

        // Clone categories
        const categoriesClone = deepClone(categories)

        // Get subcategory by nestId
        const subcategory = await getSubcategoryByNestId(categoriesClone, subcategoryData)

        // Exit if no subcategory exists
        if (!subcategory) return

        const nestId = subcategoryData.nestId

        // Loop derived subcategories or choices
        const chosenSubcategories = []
        for (const choice of choices) {
            chosenSubcategories.push(this.createSubcategory({ ...choice, nestId: `${nestId}_${choice.id}`, isSelected: choice.isSelected ?? true }))
        }
        if (subcategoryData.hasDerivedSubcategories) {
            for (const subSubcategory of subcategory.subcategories) {
                const subSubcategoryClone = deepClone(subSubcategory)
                const choice = choices.find(choice => choice.id === subSubcategoryClone.id)
                if (!choice) chosenSubcategories.push({ ...subSubcategoryClone, isSelected: false, actions: [] })
            }
        }

        subcategory.subcategories = chosenSubcategories

        // Add advanced category options
        if (advancedCategoryOptions) subcategory.advancedCategoryOptions = { ...advancedCategoryOptions }

        // Save user action list
        await this.saveUserActionList(categoriesClone)

        Logger.debug('Subcategories saved', { actionList: categoriesClone })
    }

    /**
     * Add subcategory to the derivedSubcategories map
     * @param {object} parentSubcategoryData The parent subcategory data
     * @param {object} subcategory The subcategory
     */
    addToDerivedSubcategories (parentSubcategoryData, subcategory) {
        const parentSubcategoryNestId = parentSubcategoryData.nestId
        const subcategoryClone = deepClone(subcategory, { strict: true })
        if (!this.derivedSubcategories.has(parentSubcategoryNestId)) this.derivedSubcategories.set(parentSubcategoryNestId, [])
        this.derivedSubcategories.get(parentSubcategoryNestId).push(subcategoryClone)
    }

    /**
     * Save derived subcategories to the user action list
     */
    async saveDerivedSubcategories () {
        for (const [parentSubcategoryNestId, derivedSubcategories] of this.derivedSubcategories) {
            const derivedSubcategoriesClone = deepClone(derivedSubcategories, { strict: true })
            await this.saveSubcategories(derivedSubcategoriesClone, null, { nestId: parentSubcategoryNestId, type: 'system', hasDerivedSubcategories: true })
        }
    }

    /**
     * Save user action list
     * @param {object} data
     */
    async saveUserActionList (categories) {
        Logger.debug('Saving user action list...')
        const categoriesClone = deepClone(categories)
        await game.user.setFlag(namespace, 'categories', categoriesClone)
        Logger.debug('User action list saved', { actionList: categoriesClone })
    }

    /**
     * Get advanced options
     * @param {string} nestId
     * @returns {object}
     */
    async getAdvancedCategoryOptions (nestId) {
        const categorySubcategory = await getSubcategoryByNestId(this.flattenedSubcategories, { nestId })
        const advancedCategoryOptions = categorySubcategory?.advancedCategoryOptions
        return advancedCategoryOptions ?? null
    }

    /**
     * Get selected categories as Tagify entries
     * @returns {object}
     */
    async getSelectedCategoriesAsTagifyEntries () {
        const categories = game.user.getFlag(namespace, 'categories')
        if (!categories) return
        return categories.map(category => this.toTagifyEntry(category))
    }

    /**
     * Get selected subcategories as Tagify entries
     * @param {object} subcategoryData
     * @returns {object}
     */
    async getSelectedSubcategoriesAsTagifyEntries (subcategoryData) {
        const categories = game.tokenActionHud.actionHandler.actionList.categories
        if (!categories) return []
        const subcategory = await getSubcategoryByNestId(categories, subcategoryData)
        if (!subcategory) return []
        if (!subcategory.subcategories) return []

        const subcategories = subcategory.subcategories
            .filter(subcategory => subcategory.isSelected)
            .map(subcategory => this.toTagifyEntry(subcategory))
        if (subcategories) return subcategories
        return []
    }

    /**
     * Get available subcategories as Tagify entries
     * @param {object} subcategoryData
     * @returns {object}
     */
    async getAvailableSubcategoriesAsTagifyEntries (subcategoryData) {
        const hasDerivedSubcategories = subcategoryData?.hasDerivedSubcategories
        if (hasDerivedSubcategories === 'true') return await this.getDerivedSubcategoriesAsTagifyEntries(subcategoryData)
        const systemSubcategories = await this.getSystemSubcategoriesAsTagifyEntries()
        const compendiumSubcategories = await this.getCompendiumSubcategoriesAsTagifyEntries()
        const subcategories = []
        subcategories.push(...systemSubcategories, ...compendiumSubcategories)
        return subcategories
    }

    /**
     * Get derived subcategories as Tagify entries
     * @param {object} subcategoryData
     * @returns {object}
     */
    async getDerivedSubcategoriesAsTagifyEntries (subcategoryData) {
        const nestId = subcategoryData.nestId
        const derivedSubcategories = this.getFlattenedSubcategories({ nestId, type: 'system-derived' })
        return derivedSubcategories.map(subcategory => this.toTagifyEntry(subcategory))
    }

    /**
     * Get system subcategories as Tagify entries
     * @returns {object}
     */
    async getSystemSubcategoriesAsTagifyEntries () {
        const defaultSubcategories = await game.user.getFlag(namespace, 'default.subcategories')
        return defaultSubcategories.map(subcategory => this.toTagifyEntry(subcategory))
    }

    /**
     * Get compendium subcategories as Tagify entries
     * @returns {object}
     */
    async getCompendiumSubcategoriesAsTagifyEntries () {
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

    /**
     * Whether the compendium is linked
     * @param {string} id
     * @returns {boolean}
     */
    isLinkedCompendium (id) {
        return this.categories.some(category =>
            category.subcategories?.some(subcategory => subcategory.compendiumId === id)
        )
    }

    /**
     * Convert data into Tagify entry
     * @param {object} data
     * @returns {object}
     */
    toTagifyEntry (data) {
        return {
            id: data.id,
            value: data.name,
            type: data.type,
            level: 'subcategory',
            hasDerivedSubcategories: data.hasDerivedSubcategories ?? 'false'
        }
    }
}
