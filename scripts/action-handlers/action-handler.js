import { ActionList } from '../entities/action-list.js'
import { ActionCategory } from '../entities/action-category.js'
import { ActionSubcategory } from '../entities/action-subcategory.js'
import { GenericActionHandler } from './generic-action-handler.js'
import { CompendiumActionHandler } from './compendium-action-handler.js'
import { MacroActionHandler } from './macro-action-handler.js'
import { Logger, getSetting, getSubcategoriesById, getSubcategoryByNestId } from '../utilities/utils.js'

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
        this.savedUserActionList = []
        this.savedActorActionList = []
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
        const emptyActionList = this.buildEmptyActionList(character)
        this.actionList = emptyActionList
        await Promise.all([
            this._buildSystemActions(this.actionList, character),
            this._buildGenericActions(this.actionList, character),
            this._buildCompendiumActions(this.actionList),
            this._buildMacroActions(this.actionList),
            this.buildFurtherActions(this.actionList, character)
        ])
        await this.saveActionList(this.actionList, character)
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
            game.user.flags['token-action-hud-core']?.categories ??
            game.user.flags['token-action-hud-core']?.default.categories

        for (const category of Object.entries(categories)) {
            // Add category
            emptyActionList.categories.push(
                new ActionCategory(category[1].id, category[1].title)
            )

            const lastIndex = emptyActionList.categories.length - 1
            const latestCategory = emptyActionList.categories[lastIndex]

            // Add subcategories to category
            addSubcategories(latestCategory, category[1].subcategories, category[0])

            function addSubcategories (latestCategorySubcategory, subcategories, nestId) {
                if (subcategories) {
                    for (const subcategory of Object.entries(subcategories)) {
                        latestCategorySubcategory.subcategories.push(
                            new ActionSubcategory(
                                subcategory[1].id,
                                subcategory[0],
                                subcategory[1].title,
                                subcategory[1].type
                            )
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
        Logger.debug('Empty action list built', { emptyActionList, character })
        return emptyActionList
    }

    /**
     * Build any system-specific actions
     * @param {object} emptyActionList The empty action list
     * @param {object} character The actor and/or token
     * @returns {object} The action list with system actions added
     */
    async _buildSystemActions (emptyActionList, character) {
        Logger.debug('Building system actions...', { emptyActionList, character })
        const actionList = emptyActionList
        const subcategoryIds = Object.values(actionList.categories)
            .filter((category) => category.subcategories)
            .flatMap((category) =>
                Object.values(category.subcategories)
                    .filter((subcategory) => subcategory.type === 'system')
                    .flatMap((subcategory) => subcategory.id)
            )
        await this.buildSystemActions(actionList, character, subcategoryIds)
        Logger.debug('System actions built', { actionList, character })
        return actionList
    }

    /** @public */
    async buildSystemActions (actionList, character, subcategoryIds) {}

    /**
     * Build generic actions
     * @protected
     * @param {object} actionList The action list
     * @param {object} character The actor and/or token
     */
    _buildGenericActions (actionList, character) {
        Logger.debug('Building generic actions...', { actionList, character })
        this.genericActionHandler.buildGenericActions(actionList, character)
        Logger.debug('Generic actions built...', { actionList, character })
    }

    /**
     * Build any compendium-specific actions
     * @protected
     * @param {object} actionList The action list
     */
    async _buildCompendiumActions (actionList) {
        Logger.debug('Building compendium actions...', { actionList })
        await this.compendiumActionHandler.buildCompendiumActions(actionList)
        Logger.debug('Compendium actions built', { actionList })
    }

    /**
     * Build any macro-specific actions
     * @protected
     * @param {object} actionList The action list
     */
    async _buildMacroActions (actionList) {
        Logger.debug('Building macro actions...', { actionList })
        await this.macroActionHandler.buildMacroActions(actionList)
        Logger.debug('Macro actions built', { actionList })
    }

    /**
     * Build any further actions
     * @protected
     * @param {object} actionList The action list
     * @param {object} character The actor and/or token
     */
    buildFurtherActions (actionList, character) {
        this.furtherActionHandlers.forEach((handler) =>
            handler.extendActionList(actionList, character)
        )
    }

    /**
     * Get actions as Tagify entries for dialogs
     * @param {string} nestId The ID of the nested subcategory
     * @returns {array} A list of actions
     */
    async getActionsAsTagifyEntries (nestId) {
        if (!this.actionList) return
        const subcategory = await getSubcategoryByNestId(
            this.actionList.categories,
            nestId
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
    async getSelectedActionsAsTagifyEntries (nestId) {
        if (!this.actionList) return
        const subcategory = await getSubcategoryByNestId(
            this.actionList.categories,
            nestId
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
     * @param {object} actionList The action list
     * @param {string} subcategoryId The subcategory ID
     * @param {object} data The data
     */
    addSubcategoryInfo (actionList, subcategoryId, data) {
        const subcategories = Object.values(actionList.categories)
            .flatMap((category) => category.subcategories)

        const matchingSubcategories = getSubcategoriesById(subcategories, subcategoryId)

        matchingSubcategories.forEach(matchingSubcategory => {
            matchingSubcategory.info1 = data.info1
            matchingSubcategory.info2 = data.info2
            matchingSubcategory.info3 = data.info3
        })
    }

    /**
     * Add a subcategory and its actions to the subcategory list
     * @public
     * @param {object} subcategoryList The subcategory list
     * @param {string} subcategoryId The subcategory ID
     * @param {object} subcategory The subcategory object
     * @param {object} [actions = []] The actions object
     */
    addToSubcategoryList (subcategoryList, subcategoryId, subcategory, actions = []) {
        subcategoryList.push({
            subcategoryId,
            subcategory,
            actions
        })
    }

    /**
     * Add subcategories from the subcategory list to the action list
     * @public
     * @param {object} actionList The action list
     * @param {object} subcategoryList The subcategory list
     * @param {string} subcategoryId  The subcategory ID
     */
    addSubcategoriesToActionList (actionList, subcategoryList, subcategoryId) {
        const subcategories = Object.values(actionList.categories)
            .flatMap((category) => category.subcategories)

        const matchingSubcategories = getSubcategoriesById(subcategories, subcategoryId)

        matchingSubcategories.forEach(matchingSubcategory => {
            const matchingSubcategoryNestId = matchingSubcategory.nestId
            // Clone subcategories
            const subcategoryListClone = deepClone(subcategoryList)

            // Add subcategories
            const subcategoryListSubcategories = subcategoryListClone.map(
                (subcategory) => subcategory.subcategory
            )

            // Set nestId
            subcategoryListSubcategories.forEach(subcategoryListSubcategory => {
                subcategoryListSubcategory.nestId = `${matchingSubcategoryNestId}_${subcategoryListSubcategory.nestId}`
            })

            // Set subcategories
            matchingSubcategory.subcategories.push(...subcategoryListSubcategories)
        })

        // Clone subcategories
        const subcategoryListClone = deepClone(subcategoryList)

        // Add actions
        for (const subcategory of subcategoryListClone) {
            if (!subcategory.actions) return
            this.addActionsToActionList(
                actionList,
                subcategory.actions,
                subcategory.subcategoryId
            )
        }
    }

    /**
     * Add actions to the action list
     * @param {object} actionList The action list
     * @param {object} actions The actions
     * @param {string} subcategoryId The subcategory ID
     */
    async addActionsToActionList (actionList, actions, subcategoryId) {
        if (actions.length === 0) return

        const subcategories = getSubcategoriesById(
            actionList.categories,
            subcategoryId
        )

        for (const subcategory of subcategories) {
            // Get saved subcategory
            const savedSubcategory = await getSubcategoryByNestId(
                this.savedActorActionList,
                subcategory.nestId
            )

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
     * Save the action list of user flags
     * @param {object} actionList The action list
     * @param {object} character The actor and/or token
     */
    async saveActionList (actionList, character) {
        Logger.debug('Saving action list...', { actionList, character })
        if (!character?.actor) return
        const actor = character.actor
        await actor.unsetFlag('token-action-hud-core', 'categories')
        await actor.setFlag(
            'token-action-hud-core',
            'categories',
            actionList.categories
        )
        Logger.debug('Action list saved', { actionList, character })
    }

    /**
     * Save selected actions from dialog
     * @public
     * @param {string} nestId The nested subcategory ID
     * @param {array} selectedActions The selected actions
     */
    async saveActions (nestId, selectedActions) {
        // Get nested subcategory
        const subcategory = await getSubcategoryByNestId(
            this.actionList.categories,
            nestId
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
        await this.saveActionList(this.actionList, this.character)
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

    /** @public */
    initializeEmptyCategory (categoryId) {
        const category = new ActionCategory()
        category.id = categoryId
        return category
    }

    /**
     * Initialise empty subcategory
     * @param {string} id The subcategory ID
     * @param {string} parentNestId The parent nested subcategory ID
     * @param {string} name The subcategory name
     * @param {string} type The subcategory type
     * @returns {object} The empty subcategory
     */
    initializeEmptySubcategory (id = '', parentNestId = '', name = '', type = '') {
        const subcategory = new ActionSubcategory(id, parentNestId, name, type)
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
        items = Object.values(items)
        items.sort((a, b) => a.sort - b.sort)
        return items
    }
}
