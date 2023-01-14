import { ActionList } from '../entities/action-list.js'
import { ActionCategory } from '../entities/action-category.js'
import { ActionSubcategory } from '../entities/action-subcategory.js'
import { GenericActionHandler } from './generic-action-handler.js'
import { CompendiumActionHandler } from './compendium-action-handler.js'
import { MacroActionHandler } from './macro-action-handler.js'
import { Logger, getSetting, getSubcategories, getSubcategoryByNestId } from '../utilities/utils.js'

export class ActionHandler {
    i18n = (toTranslate) => game.i18n.localize(toTranslate)

    furtherActionHandlers = []
    delimiter = '|'

    constructor (character, categoryManager) {
        this.character = character
        this.categoryManager = categoryManager
        this.genericActionHandler = new GenericActionHandler(this)
        this.compendiumActionHandler = new CompendiumActionHandler(this)
        this.macroActionHandler = new MacroActionHandler(this)
        this.actionList = []
        this.flattenedSubcategories = []
        this.savedUserActionList = []
        this.savedActorActionList = []
        this.derivedSubcategories = new Map()
        this.displayIcons = getSetting('displayIcons')
    }

    resetActionHandler () {
        this.genericActionHandler = new GenericActionHandler(this)
        this.compendiumActionHandler = new CompendiumActionHandler(this)
        this.macroActionHandler = new MacroActionHandler(this)
        this.actionList = []
        this.flattenedSubcategories = []
        this.savedUserActionList = []
        this.savedActorActionList = []
        this.derivedSubcategories = new Map()
        this.displayIcons = getSetting('displayIcons')
    }

    /**
     * Build the action list
     * @param {object} character The actor and token
     * @returns {object} The action list
     */
    async buildActionList (character) {
        Logger.debug('Building action list...', { character })
        this.character = character
        this.savedUserActionList = this.getSavedUserActionList(character)
        this.savedActorActionList = this.getSavedActorActionList(character)
        this.actionList = this.buildEmptyActionList(character)
        this.flattenedSubcategories = this.flattenSubcategories()
        await Promise.all([
            this._buildSystemActions(character),
            this._buildGenericActions(character),
            this._buildCompendiumActions(),
            this._buildMacroActions(),
            this.buildFurtherActions(character)
        ])
        await this.saveActionList(character)
        await this.saveDerivedSubcategories()
        Logger.debug('Action list built', { actionList: this.actionList, character })
        return this.actionList
    }

    /**
     * Get the saved action list from the user flags
     * @param {object} character The actor and token
     * @returns {object} The saved action list
     */
    getSavedUserActionList (character) {
        Logger.debug('Retrieving saved action list  from user...', { character })
        const categories = game.user.getFlag('token-action-hud-core', 'categories')
        if (!categories) return []
        const savedUserActionList = categories
        Logger.debug('Saved action list from user retrieved', { savedUserActionList, character })
        return savedUserActionList
    }

    /**
     * Get the saved action list from the user flags
     * @param {object} character The actor and token
     * @returns {object} The saved action list
     */
    getSavedActorActionList (character) {
        Logger.debug('Retrieving saved action list from actor...', { character })
        const actor = character?.actor
        if (!actor) return []
        const categories = actor.getFlag('token-action-hud-core', 'categories')
        if (!categories) return []
        const savedActorActionList = categories
        Logger.debug('Saved action list from actor retrieved', { savedActorActionList, character })
        return savedActorActionList
    }

    /**
     * Build an empty action list
     * @param {object} character The actor and token
     * @returns {object} The empty action list
     */
    buildEmptyActionList (character) {
        Logger.debug('Building empty action list...', { character })
        let hudTitle = ''
        if (getSetting('displayCharacterName')) hudTitle = character?.name ?? 'Multiple'
        const tokenId = character?.token?.id ?? 'multi'
        const actorId = character?.actor?.id ?? 'multi'
        const emptyActionList = new ActionList(hudTitle, tokenId, actorId)

        const categories =
            game.user.getFlag('token-action-hud-core', 'categories') ??
            game.user.getFlag('token-action-hud-core', 'default.categories')

        for (const category of Object.entries(categories)) {
            // Add category
            emptyActionList.categories.push(
                new ActionCategory(category[1].id, category[1].name)
            )

            const lastIndex = emptyActionList.categories.length - 1
            const latestCategory = emptyActionList.categories[lastIndex]

            // Add subcategories to category
            addSubcategories(latestCategory, category[1].subcategories, category[0])

            function addSubcategories (latestCategorySubcategory, subcategories, nestId = null) {
                if (subcategories) {
                    for (const subcategory of Object.entries(subcategories)) {
                        const subcategoryData = {
                            id: subcategory[1].id,
                            nestId: subcategory[0],
                            name: subcategory[1].name,
                            type: subcategory[1].type
                        }
                        latestCategorySubcategory.subcategories.push(
                            new ActionSubcategory(subcategoryData)
                        )

                        if (subcategory[1].subcategories) {
                            const lastIndex = latestCategorySubcategory.subcategories.length - 1
                            const latestSubcategory = latestCategorySubcategory.subcategories[lastIndex]

                            addSubcategories(latestSubcategory, subcategory[1].subcategories, subcategory[0])
                        }
                    }
                }
            }
        }
        Logger.debug('Empty action list built', { emptyActionList: deepClone(emptyActionList), character })
        return emptyActionList
    }

    /**
     * Build any system-specific actions
     * @param {object} character The actor and/or token
     */
    async _buildSystemActions (character) {
        Logger.debug('Building system actions...', { character })
        const subcategoryIds = Object.values(this.actionList.categories)
            .filter((category) => category.subcategories)
            .flatMap((category) =>
                Object.values(category.subcategories)
                    .filter((subcategory) => subcategory.type === 'system')
                    .flatMap((subcategory) => subcategory.id)
            )
        await this.buildSystemActions(character, subcategoryIds)
        Logger.debug('System actions built', { actionList: deepClone(this.actionList), character })
    }

    /** @public */
    async buildSystemActions (character, subcategoryIds) {}

    /**
     * Build generic actions
     * @protected
     * @param {object} character The actor and/or token
     */
    _buildGenericActions (character) {
        Logger.debug('Building generic actions...', { character })
        this.genericActionHandler.buildGenericActions(character)
        Logger.debug('Generic actions built...', { actionList: deepClone(this.actionList), character })
    }

    /**
     * Build any compendium-specific actions
     * @protected
     */
    async _buildCompendiumActions () {
        Logger.debug('Building compendium actions...')
        await this.compendiumActionHandler.buildCompendiumActions()
        Logger.debug('Compendium actions built', { actionList: deepClone(this.actionList) })
    }

    /**
     * Build any macro-specific actions
     * @protected
     */
    async _buildMacroActions () {
        Logger.debug('Building macro actions...')
        await this.macroActionHandler.buildMacroActions()
        Logger.debug('Macro actions built', { actionList: deepClone(this.actionList) })
    }

    /**
     * Build any further actions
     * @protected
     * @param {object} actionList The action list
     * @param {object} character The actor and/or token
     */
    buildFurtherActions (character) {
        this.furtherActionHandlers.forEach((handler) =>
            handler.extendActionList(character)
        )
    }

    /**
     * Get actions as Tagify entries for dialogs
     * @param {string} nestId The ID of the nested subcategory
     * @returns {array} A list of actions
     */
    async getActionsAsTagifyEntries (subcategoryData) {
        if (!this.actionList) return
        const subcategory = await getSubcategoryByNestId(
            this.actionList.categories,
            subcategoryData
        )
        const actions = subcategory.actions.map((action) =>
            this.toTagifyEntry(action)
        )
        return actions
    }

    /**
     * Get selected actions as Tagify entries for dialogs
     * @param {string} nestId The ID of the nested subcategory
     * @returns {array} A list of actions
     */
    async getSelectedActionsAsTagifyEntries (subcategoryData) {
        if (!this.actionList) return
        const subcategory = await getSubcategoryByNestId(
            this.actionList.categories,
            subcategoryData
        )
        const actions = subcategory.actions
            .filter((action) => action.selected === true)
            .map((action) => this.toTagifyEntry(action))
        return actions
    }

    /**
     * Register default categories from the Token Action Hud system module
     * @public
     */
    async registerDefaultCategories () {}

    // ADD SUBCATEGORIES/ACTIONS

    /**
     * Add info to subcategory
     * @param {string} subcategoryId The subcategory ID
     * @param {object} data The data
     */
    addSubcategoryInfo (subcategoryData = {}) {
        const subcategoryId = subcategoryData?.subcategoryId
        const subcategoryType = subcategoryData?.subcategoryType ?? 'system'
        const subcategoryInfo = subcategoryData?.subcategoryInfo

        if (!subcategoryId || !subcategoryInfo) return

        const matchingSubcategories = this.getFlattenedSubcategories({ subcategoryId, subcategoryType })

        matchingSubcategories.forEach(matchingSubcategory => {
            matchingSubcategory.info1 = subcategoryInfo.info1
            matchingSubcategory.info2 = subcategoryInfo.info2
            matchingSubcategory.info3 = subcategoryInfo.info3
        })
    }

    /**
     * Add a subcategory and its actions to the subcategory list
     * @public
     * @param {object} flattenedSubcategories The subcategory list
     * @param {string} subcategoryId The subcategory ID
     * @param {object} subcategory The subcategory object
     * @param {object} [actions = []] The actions object
     */
    addToflattenedSubcategories (flattenedSubcategories, subcategoryId, subcategory, actions = []) {
        flattenedSubcategories.push({
            subcategoryId,
            subcategory,
            actions
        })
    }

    /**
     * Add subcategory to the action list
     * @public
     * @param {object} parentSubcategoryId The parent subcategory ID
     * @param {string} subcategory  The subcategory
     */
    addSubcategoryToActionList (parentSubcategoryData, subcategoryData) {
        const subcategoryId = parentSubcategoryData?.id
        const subcategoryType = parentSubcategoryData?.type ?? 'system'

        if (!subcategoryId) return

        const matchingSubcategories = this.getFlattenedSubcategories({ subcategoryId, subcategoryType })

        if (!matchingSubcategories) return

        const subcategory = this.initializeSubcategory(subcategoryData)

        for (const matchingSubcategory of matchingSubcategories) {
            // Exit if subcategory already exists
            if (matchingSubcategory.subcategories.find(subcategory => subcategory.id === subcategoryData.id)) return

            const matchingSubcategoryNestId = matchingSubcategory.nestId

            // Clone subcategory
            const subcategoryClone = deepClone(subcategory)

            // Set nestId
            subcategoryClone.nestId = `${matchingSubcategoryNestId}_${subcategoryClone.id}`

            // Set subcategories
            matchingSubcategory.subcategories.push(subcategoryClone)

            // Add subcategory to derivedSubcategories variable
            const tagifiedSubcategory = { id: subcategoryClone.id, name: subcategoryClone.name, type: subcategoryClone.type }

            const mapElement = this.derivedSubcategories.get(matchingSubcategoryNestId)
            if (mapElement) {
                mapElement.push(tagifiedSubcategory)
            } else {
                this.derivedSubcategories.set(matchingSubcategoryNestId, [tagifiedSubcategory])
            }

            this.flattenedSubcategories.push(subcategoryClone)
        }
    }

    /**
     * Add actions to the action list
     * @param {object} actions The actions
     * @param {string} subcategoryId The subcategory ID
     */
    async addActionsToActionList (actions, subcategoryData = {}) {
        // Exit if no actions exist
        if (!actions.length) return

        // Exit if no subcatgoryId exists
        const subcategoryId = (typeof subcategoryData === 'string') ? subcategoryData : subcategoryData?.id
        if (!subcategoryId) return

        const subcategoryType = subcategoryData?.type ?? 'system'

        // Get subcategories
        const subcategories = this.getFlattenedSubcategories({ subcategoryId, subcategoryType })

        // Exit if no subcategories found
        if (!subcategories) return

        for (const subcategory of subcategories) {
            // Get saved subcategory
            const nestId = subcategory.nestId
            const type = subcategory.type
            const savedSubcategory = await getSubcategoryByNestId(this.savedActorActionList, { nestId, type })

            // Get saved actions
            const savedActions = savedSubcategory?.actions ?? []

            const reorderedActions = []

            // Set 'selected' to saved action 'selected'
            // Reorder actions based on saved action list
            for (const savedAction of savedActions) {
                const action = actions.find((action) => action.encodedValue === savedAction.encodedValue)
                if (action) {
                    const actionClone = structuredClone(action)
                    actionClone.selected = savedAction.selected ?? true
                    reorderedActions.push(actionClone)
                }
            }
            for (const action of actions) {
                const savedAction = savedActions.find((savedAction) => savedAction.encodedValue === action.encodedValue)
                if (!savedAction) {
                    const actionClone = structuredClone(action)
                    actionClone.selected = true
                    reorderedActions.push(actionClone)
                }
            }

            // Update action list
            subcategory.actions = reorderedActions
        }
    }

    /**
     * Save custom subcategories to the user flag
     * @returns {void}
     */
    async saveDerivedSubcategories () {
        if (this.derivedSubcategories.size === 0) return
        for (const [key, value] of this.derivedSubcategories) {
            const nestId = key
            const subcategoryType = 'system-derived'
            const subcategoryData = { nestId, subcategoryType }
            const subcategories = value
            await game.tokenActionHud.categoryManager.saveSubcategories(subcategories, null, subcategoryData)
        }
    }

    /**
     * Save the action list to the actor flag
     * @param {object} character The actor and/or token
     */
    async saveActionList (character) {
        Logger.debug('Saving action list...', { character })
        if (!character?.actor) return
        const actor = character.actor
        await actor.unsetFlag('token-action-hud-core', 'categories')
        await actor.setFlag(
            'token-action-hud-core',
            'categories',
            this.actionList.categories
        )
        Logger.debug('Action list saved', { actionList: this.actionList, character })
    }

    /**
     * Save selected actions from dialog
     * @public
     * @param {string} nestId The nested subcategory ID
     * @param {array} selectedActions The selected actions
     */
    async saveActions (selectedActions, subcategoryData) {
        // Get nested subcategory
        const subcategory = await getSubcategoryByNestId(
            this.actionList.categories,
            subcategoryData
        )

        // Get actions from subcategory
        const actions = subcategory.actions

        const reorderedActions = []

        // Set 'selected' to true for selected actions
        // Reorder actions based on order in dialog
        for (const selectedAction of selectedActions) {
            const action = actions.find(
                (action) => action.encodedValue === selectedAction.id
            )
            if (action) {
                const actionClone = structuredClone(action)
                actionClone.selected = true
                reorderedActions.push(actionClone)
            }
        }
        // Set 'selected' to false for unselected actions
        for (const action of actions) {
            const selectedAction = selectedActions.find(
                (selectedAction) => selectedAction.id === action.encodedValue
            )
            if (!selectedAction) {
                const actionClone = structuredClone(action)
                actionClone.selected = false
                reorderedActions.push(actionClone)
            }
        }

        // Replace subcategory actions
        subcategory.actions = reorderedActions

        // Save action list
        await this.saveActionList(this.character)
    }

    /**
     * Add further action handler
     * @public
     * @param {object} handler The handler
     */
    addFurtherActionHandler (handler) {
        Logger.debug('Adding further action handler...', { handler })
        this.furtherActionHandlers.push(handler)
    }

    flattenSubcategories () {
        return getSubcategories(this.actionList.categories)
    }

    getFlattenedSubcategories (searchCriteria) {
        const subcategoryId = searchCriteria.subcategoryId
        const subcategoryType = searchCriteria.subcategoryType
        return this.flattenedSubcategories.filter(
            subcategory => subcategory.id === subcategoryId && (!subcategoryType || subcategory.type === subcategoryType)
        )
    }

    /** @public */
    initializeEmptyCategory (categoryId) {
        const category = new ActionCategory()
        category.id = categoryId
        return category
    }

    /**
     * Initialise empty subcategory
     * @param {object} subcategoryData The subcategory data
     * @returns {object} The subcategory
     */
    initializeSubcategory (subcategoryData) {
        const subcategory = new ActionSubcategory(subcategoryData)
        return subcategory
    }

    /**
     * Convert into Tagify entry
     * @param {object} data The data
     * @returns {object} Tagify entry
     */
    toTagifyEntry (data) {
        return { id: data.encodedValue, value: data.name, type: 'action', level: 'action' }
    }

    /**
     * Get image from entity
     * @param {object} entity The entity
     * @param {array} defaultImages Any default images
     * @returns The image
     */
    getImage (entity, defaultImages = []) {
        defaultImages.push('icons/svg/mystery-man.svg')
        let result = ''
        if (this.displayIcons) result = entity?.img ?? entity?.icon ?? ''
        return !defaultImages.includes(result) ? result : ''
    }

    /**
     * Sort items
     * @param {object} items The items
     * @returns The sorted items
     */
    sortItems (items) {
        return new Map([...items.entries()].sort((a, b) => a[1].sort.localeCompare(b[1].sort)))
    }

    /**
     * Sort items by name
     * @param {object} items The items
     * @returns The sorted items
     */
    sortItemsByName (items) {
        return new Map([...items.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)))
    }
}
