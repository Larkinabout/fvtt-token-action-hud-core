import { COMPENDIUM_PACK_TYPES, MODULE, SUBCATEGORY_LEVEL, SUBCATEGORY_TYPE } from './constants.js'
import { Logger, Utils } from './utilities/utils.js'

export class CategoryManager {
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
     * Copy user's 'categories' flag to others users
     * @param {string} fromUserId The user id to copy from
     * @param {string|array} toUserIds The user ids to copy to
     */
    async copyUserFlags (fromUserId, toUserIds) {
        // Exit if parameters are missing
        if (!fromUserId || !toUserIds.length) return false

        Logger.debug('Copying user flags...')

        const fromCategories = game.users.get(fromUserId).getFlag(MODULE.ID, 'categories')

        if (typeof toUserIds === 'string') {
            game.users.get(toUserIds).setFlag(MODULE.ID, 'categories', fromCategories)
        } else if (Array.isArray(toUserIds)) {
            toUserIds.forEach(userId => {
                game.users.get(userId).setFlag(MODULE.ID, 'categories', fromCategories)
            })
        }
        Logger.debug('User flags copied')
        return true
    }

    /**
     * Reset actor flags
     */
    async resetActorFlags () {
        Logger.debug('Resetting actor flags...')
        const actors = game.actors.filter(actor => actor.getFlag(MODULE.ID, 'categories'))
        if (actors) {
            actors.forEach(actor => {
                Logger.debug(`Resetting flags for actor [${actor.id}]`, { actor })
                actor.unsetFlag(MODULE.ID, 'categories')
            })
        }
        Logger.debug('Actor flags reset')
    }

    /**
     * Reset user flags
     */
    async resetUserFlags () {
        Logger.debug('Resetting user flags...')
        await Utils.unsetUserFlag('categories')
        this.resetCategoryManager()
        await this._registerDefaultCategories()
        Logger.debug('User flags reset')
    }

    /**
     * Initialise saved or default categories
     */
    async init () {
        const savedCategories = Utils.getUserFlag('categories')
        if (!savedCategories || !savedCategories.length) return this._registerDefaultCategories()
        Logger.debug('Retrieved saved categories', { savedCategories })
    }

    /**
     * Register default categories
     */
    async _registerDefaultCategories () {
        const defaultCategories = Utils.getUserFlag('default.categories')
        if (!defaultCategories) return
        await Utils.setUserFlag('categories', defaultCategories)
        Logger.debug('Registered default categories', { defaultCategories })
    }

    /**
     * Create category
     * @param {object} categoryData The category data
     * @returns {object}            The category
     */
    createCategory (categoryData) {
        const categoryDataClone = Utils.deepClone(categoryData)
        // New option for 1.1.0 - Define default showTitle for existing data
        if (!categoryDataClone?.advancedCategoryOptions) categoryDataClone.advancedCategoryOptions = {}
        if (typeof categoryDataClone?.advancedCategoryOptions?.showTitle === 'undefined') categoryDataClone.advancedCategoryOptions.showTitle = true
        return {
            id: categoryDataClone?.id,
            nestId: categoryDataClone?.nestId ?? this.id,
            name: categoryDataClone?.name,
            level: SUBCATEGORY_LEVEL.CATEGORY,
            advancedCategoryOptions: categoryDataClone?.advancedCategoryOptions ?? {},
            cssClass: '',
            subcategories: []
        }
    }

    /**
     * Create subcategory
     * @param {object} subcategoryData The subcategory data
     * @returns {object}               The subcategory
     */
    createSubcategory (subcategoryData) {
        const subcategoryDataClone = Utils.deepClone(subcategoryData)
        // New option for 1.1.0 - Define default showTitle for existing data
        if (!subcategoryDataClone?.advancedCategoryOptions) subcategoryDataClone.advancedCategoryOptions = {}
        if (typeof subcategoryDataClone?.advancedCategoryOptions?.showTitle === 'undefined') subcategoryDataClone.advancedCategoryOptions.showTitle = true
        subcategoryDataClone.subtitleClass = (!subcategoryDataClone?.advancedCategoryOptions?.showTitle) ? 'tah-hidden' : ''

        return {
            id: subcategoryDataClone?.id,
            nestId: subcategoryDataClone?.nestId,
            name: subcategoryDataClone?.name,
            type: subcategoryDataClone?.type ?? SUBCATEGORY_TYPE.CUSTOM,
            level: SUBCATEGORY_LEVEL.SUBCATEGORY,
            advancedCategoryOptions: subcategoryDataClone?.advancedCategoryOptions ?? { showTitle: true },
            hasDerivedSubcategories: subcategoryDataClone?.hasDerivedSubcategories ?? false,
            subtitleClass: subcategoryDataClone?.subtitleClass ?? '',
            isSelected: subcategoryDataClone?.isSelected ?? true,
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
        this.flattenedSubcategories = Utils.getSubcategories(actionList.categories)
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

        // Return empty array if no flattened subcategories exist
        if (!this.flattenedSubcategories) return []

        return this.flattenedSubcategories.filter(
            subcategory =>
                (!subcategoryId || subcategory.id === subcategoryId) &&
                (!subcategoryNestId || subcategory?.nestId?.startsWith(subcategoryNestId)) &&
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
            const categoryClone = Utils.deepClone(category)
            chosenCategories.push({
                ...category,
                name: choice.name
            })
        }

        if (chosenCategories) await this.saveUserActionList(chosenCategories)
    }

    /**
     * Save subcategories to the user action list
     * @param {array} subcategories The subcategories to save
     * @param {object} parentSubcategoryData The parent subcategory to add the subcategories to
     * @param {boolean} updateSelected Whether to update the isSelected flag
     */
    async saveSubcategories (subcategories, parentSubcategoryData, updateSelected = true) {
        Logger.debug('Saving subcategories...', { subcategories, parentSubcategoryData })

        const categories = game.tokenActionHud.actionHandler.actionList.categories

        // Clone categories
        const categoriesClone = Utils.deepClone(categories)

        // Get subcategory by nestId
        const subcategory = await Utils.getSubcategoryByNestId(categoriesClone, parentSubcategoryData)

        // Exit if no subcategory exists
        if (!subcategory) return

        const nestId = parentSubcategoryData.nestId

        // Loop derived subcategories or choices
        const chosenSubcategories = []
        for (const subcategory of subcategories) {
            chosenSubcategories.push(this.createSubcategory({
                ...subcategory,
                nestId: `${nestId}_${subcategory.id}`,
                isSelected: subcategory.isSelected ?? true
            }))
        }
        if (parentSubcategoryData.hasDerivedSubcategories) {
            for (const subSubcategory of subcategory.subcategories) {
                const subSubcategoryClone = Utils.deepClone(subSubcategory)
                const subcategory = subcategories.find(subcategory => subcategory.id === subSubcategoryClone.id)
                if (updateSelected) {
                    subSubcategoryClone.isSelected = false
                    subSubcategoryClone.actions = []
                }
                if (!subcategory) chosenSubcategories.push(subSubcategoryClone)
            }
        }

        subcategory.subcategories = chosenSubcategories

        // Add advanced category options
        if (parentSubcategoryData.advancedCategoryOptions) subcategory.advancedCategoryOptions = parentSubcategoryData.advancedCategoryOptions

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
        const subcategoryClone = Utils.deepClone(subcategory, { strict: true })
        if (!this.derivedSubcategories.has(parentSubcategoryNestId)) this.derivedSubcategories.set(parentSubcategoryNestId, [])
        this.derivedSubcategories.get(parentSubcategoryNestId).push(subcategoryClone)
    }

    /**
     * Save derived subcategories to the user action list
     */
    async saveDerivedSubcategories () {
        for (const [parentSubcategoryNestId, derivedSubcategories] of this.derivedSubcategories) {
            const derivedSubcategoriesClone = Utils.deepClone(derivedSubcategories, { strict: true })
            const updateSelected = false
            await this.saveSubcategories(
                derivedSubcategoriesClone,
                {
                    nestId: parentSubcategoryNestId,
                    type: SUBCATEGORY_TYPE.SYSTEM,
                    hasDerivedSubcategories: true
                },
                updateSelected
            )
        }
    }

    /**
     * Save user action list
     * @param {object} data
     */
    async saveUserActionList (categories) {
        Logger.debug('Saving user action list...')
        const categoriesClone = Utils.deepClone(categories)
        await Utils.setUserFlag('categories', categoriesClone)
        Logger.debug('User action list saved', { actionList: categoriesClone })
    }

    /**
     * Get advanced options
     * @param {string} nestId
     * @returns {object}
     */
    async getAdvancedCategoryOptions (subcategoryData) {
        const categorySubcategory = await Utils.getSubcategoryByNestId(this.flattenedSubcategories, subcategoryData)
        const advancedCategoryOptions = categorySubcategory?.advancedCategoryOptions
        return advancedCategoryOptions ?? null
    }

    /**
     * Get selected categories as Tagify entries
     * @returns {object}
     */
    async getSelectedCategoriesAsTagifyEntries () {
        const categories = Utils.getUserFlag('categories')
        if (!categories) return
        return categories.map(category => this._toTagifyEntry(category))
    }

    /**
     * Get selected subcategories as Tagify entries
     * @param {object} subcategoryData
     * @returns {object}
     */
    async getSelectedSubcategoriesAsTagifyEntries (subcategoryData) {
        const categories = game.tokenActionHud.actionHandler.actionList.categories
        if (!categories) return []
        const subcategory = await Utils.getSubcategoryByNestId(categories, subcategoryData)
        if (!subcategory) return []
        if (!subcategory.subcategories) return []

        const subcategories = subcategory.subcategories
            .filter(subcategory => subcategory.isSelected)
            .map(subcategory => this._toTagifyEntry(subcategory))
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
        const derivedSubcategories = this.getFlattenedSubcategories({ nestId, type: SUBCATEGORY_TYPE.SYSTEM_DERIVED })
        return derivedSubcategories.map(subcategory => this._toTagifyEntry(subcategory))
    }

    /**
     * Get system subcategories as Tagify entries
     * @returns {object}
     */
    async getSystemSubcategoriesAsTagifyEntries () {
        const defaultSubcategories = Utils.getUserFlag('default.subcategories')
        return defaultSubcategories.map(subcategory => this._toTagifyEntry(subcategory))
    }

    /**
     * Get compendium subcategories as Tagify entries
     * @returns {object}
     */
    async getCompendiumSubcategoriesAsTagifyEntries () {
        const packs = game.packs
        return packs
            .filter(pack => COMPENDIUM_PACK_TYPES.includes(pack.documentName))
            .filter(pack => game.user.isGM || !pack.private)
            .map((pack) => {
                const id = pack.metadata.id.replace('.', '-')
                const value = pack.metadata.label
                return { id, value, type: SUBCATEGORY_TYPE.COMPENDIUM, level: SUBCATEGORY_TYPE.SUBCATEGORY }
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
     * @private
     * @param {object} data
     * @returns {object}
     */
    _toTagifyEntry (data) {
        return {
            id: data.id,
            value: data.name,
            type: data.type,
            level: SUBCATEGORY_LEVEL.SUBCATEGORY,
            hasDerivedSubcategories: data.hasDerivedSubcategories ?? 'false'
        }
    }
}
