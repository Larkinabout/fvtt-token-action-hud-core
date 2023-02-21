import { GenericActionHandler } from './generic-action-handler.js'
import { CompendiumActionHandler } from './compendium-action-handler.js'
import { MacroActionHandler } from './macro-action-handler.js'
import { DELIMITER, MODULE, SUBCATEGORY_LEVEL } from '../constants.js'
import { Logger, Utils } from '../utilities/utils.js'

/**
 * Handler for building the HUD's action list.
 */
export class ActionHandler {
    furtherActionHandlers = []
    delimiter = DELIMITER

    constructor (categoryManager) {
        this.categoryManager = categoryManager
        this.flattenedSubcategories = categoryManager.flattenedSubcategories
        this.character = null
        this.genericActionHandler = new GenericActionHandler(this)
        this.compendiumActionHandler = new CompendiumActionHandler(this)
        this.macroActionHandler = new MacroActionHandler(this)
        this.actionList = []
        this.availableActions = []
        this.flattenedActions = []
        this.userActionList = []
        this.savedUserActionList = []
        this.savedActorActionList = []
        this.displayIcons = Utils.getSetting('displayIcons')
    }

    /**
     * Reset action handler variables
     */
    resetActionHandler () {
        this.genericActionHandler = new GenericActionHandler(this)
        this.compendiumActionHandler = new CompendiumActionHandler(this)
        this.macroActionHandler = new MacroActionHandler(this)
        this.actionList = []
        this.availableActions = []
        this.flattenedActions = []
        this.userActionList = []
        this.savedUserActionList = []
        this.savedActorActionList = []
        this.displayIcons = Utils.getSetting('displayIcons')
    }

    /**
     * Build the action list
     * @param {object} character The actor and token
     * @returns {object}         The action list
     */
    async buildActionList (character) {
        Logger.debug('Building action list...', { character })
        this.resetActionHandler()
        await this.categoryManager.resetCategoryManager()
        this.character = character
        this.savedUserActionList = await this._getSavedUserActionList(character)
        if (this.character) this.savedActorActionList = await this._getSavedActorActionList(character)
        this.actionList = await this._buildEmptyActionList(character)
        await this.categoryManager.flattenSubcategories(this.actionList)
        await Promise.all([
            this._buildSystemActions(character),
            this._buildGenericActions(character),
            this._buildCompendiumActions(),
            this._buildMacroActions()
        ])
        await this.buildFurtherActions(character)
        await this.categoryManager.saveDerivedSubcategories()
        await this._setCharacterLimit()
        if (this.character) await this._saveActorActionList(character)
        Logger.debug('Action list built', { actionList: this.actionList, character })
        return this.actionList
    }

    /**
     * Get the saved action list from the user flags
     * @private
     * @param {object} character The actor and token
     * @returns {object}         The saved action list
     */
    _getSavedUserActionList (character) {
        Logger.debug('Retrieving saved action list from user...', { character })
        const categories = Utils.getUserFlag('categories')
        if (!categories) return []
        const savedUserActionList = Utils.deepClone(categories)
        Logger.debug('Action list from user retrieved', { savedUserActionList, character })
        return savedUserActionList
    }

    /**
     * Get the saved action list from the user flags
     * @private
     * @param {object} character The actor and token
     * @returns {object}         The saved action list
     */
    _getSavedActorActionList (character) {
        Logger.debug('Retrieving saved action list from actor...', { character })
        const actor = character?.actor
        if (!actor) return []
        const categories = actor.getFlag(MODULE.ID, 'categories')
        if (!categories) return []
        const savedActorActionList = Utils.deepClone(categories)
        Logger.debug('Action list from actor retrieved', { savedActorActionList, character })
        return savedActorActionList
    }

    /**
     * Build an empty action list
     * @param {object} character The actor and token
     * @returns {object}         The empty action list
     */
    async _buildEmptyActionList (character) {
        Logger.debug('Building empty action list...', { character })
        let hudTitle = ''
        if (Utils.getSetting('displayCharacterName')) hudTitle = character?.name ?? 'Multiple'
        const tokenId = character?.token?.id ?? 'multi'
        const actorId = character?.actor?.id ?? 'multi'
        const emptyActionList = {
            hudTitle,
            tokenId,
            actorId,
            categories: []
        }

        const userCategories = (this.savedUserActionList?.length) ? this.savedUserActionList : Utils.getUserFlag('default.categories')
        const actorCategories = this.savedActorActionList ?? []

        for (const category of userCategories) {
            // Add category to action list and flattened subcategories
            const categoryData = this.categoryManager.createCategory(category)
            emptyActionList.categories.push(this.categoryManager.createCategory(category))
            this.categoryManager.addToFlattenedSubcategories(categoryData)

            const lastIndex = emptyActionList.categories.length - 1
            const latestCategory = emptyActionList.categories[lastIndex]

            // addSubcategories function
            const addSubcategories = async (latestCategorySubcategory, subcategories) => {
                if (subcategories) {
                    for (const subcategory of subcategories) {
                        // Add subcategory to action list and flattened subcategories
                        const subcategoryData = this.categoryManager.createSubcategory(subcategory)

                        const actorSubcategory = await Utils.getSubcategoryByNestId(actorCategories, subcategoryData)
                        const actions = actorSubcategory?.actions ?? []
                        if (actions.length) {
                            subcategoryData.actions = actions
                            this.flattenedActions.push(...actions)
                        }

                        latestCategorySubcategory.subcategories.push(subcategoryData)
                        this.categoryManager.addToFlattenedSubcategories(subcategoryData)

                        if (subcategory?.subcategories?.length) {
                            const lastIndex = latestCategorySubcategory.subcategories.length - 1
                            const latestSubcategory = latestCategorySubcategory.subcategories[lastIndex]

                            await addSubcategories(latestSubcategory, subcategory.subcategories)
                        }
                    }
                }
            }

            // Add subcategories to category
            await addSubcategories(latestCategory, category.subcategories, category.nestId)
        }

        Logger.debug('Empty action list built', { emptyActionList, character })
        return emptyActionList
    }

    /**
     * Build any system-specific actions
     * @param {object} character The actor and/or token
     */
    async _buildSystemActions (character) {
        Logger.debug('Building system actions...', { character })
        const subcategories = this.categoryManager.getFlattenedSubcategories({ level: 'subcategory' })
        const subcategoryIds = subcategories.map(subcategory => subcategory.id)
        await this.buildSystemActions(character, subcategoryIds)
        Logger.debug('System actions built', { actionList: this.actionList, character })
    }

    /**
     * Placeholder function for the system module
     * */
    async buildSystemActions (character, subcategoryIds) {}

    /**
     * Build generic actions
     * @protected
     * @param {object} character The actor and/or token
     */
    _buildGenericActions (character) {
        Logger.debug('Building generic actions...', { character })
        this.genericActionHandler.buildGenericActions(character)
        Logger.debug('Generic actions built', { actionList: this.actionList, character })
    }

    /**
     * Build any compendium-specific actions
     * @protected
     */
    async _buildCompendiumActions () {
        Logger.debug('Building compendium actions...')
        await this.compendiumActionHandler.buildCompendiumActions()
        Logger.debug('Compendium actions built', { actionList: this.actionList })
    }

    /**
     * Build any macro-specific actions
     * @protected
     */
    async _buildMacroActions () {
        Logger.debug('Building macro actions...')
        await this.macroActionHandler.buildMacroActions()
        Logger.debug('Macro actions built', { actionList: this.actionList })
    }

    /**
     * Build any further actions
     * @protected
     * @param {object} character The actor and/or token
     */
    async buildFurtherActions (character) {
        this.furtherActionHandlers.forEach(handler => handler.extendActionList(character))
    }

    /**
     * Create action
     * @param {object} actionData The action data
     * @returns {object}          The action
     */
    createAction (actionData) {
        return {
            id: actionData.id,
            name: actionData.name,
            fullName: actionData.fullName ?? actionData.name,
            listName: actionData.listName ?? actionData.name,
            encodedValue: actionData.encodedValue,
            cssClass: actionData.cssClass ?? '',
            icon1: actionData.icon1 ?? '',
            icon2: actionData.icon2 ?? '',
            icon3: actionData.icon3 ?? '',
            img: actionData.img ?? '',
            info1: {
                class: actionData?.info1?.class ?? '',
                text: actionData?.info1?.text ?? '',
                title: actionData?.info1?.title ?? ''
            },
            info2: {
                class: actionData?.info2?.class ?? '',
                text: actionData?.info2?.text ?? '',
                title: actionData?.info2?.title ?? ''
            },
            info3: {
                class: actionData?.info3?.class ?? '',
                text: actionData?.info3?.text ?? '',
                title: actionData?.info3?.title ?? ''
            },
            isPreset: actionData.isPreset ?? false,
            userSelected: actionData.userSelected ?? true,
            systemSelected: actionData.systemSelected ?? true,
            selected: (!actionData.systemSelected) ? false : actionData.userSelected ?? actionData.systemSelected ?? true
        }
    }

    /**
     * Add to available actions
     * @param {array} actions The actions
     */
    addToAvailableActions (actions) {
        for (const action of actions) {
            const existingAction = this.availableActions.find(availableAction => availableAction.id === action.id)
            if (!existingAction) this.availableActions.push(action)
        }
    }

    /**
     * Get flattened actions
     * @param {object} actionData The action data
     * @returns {array}           The actions
     */
    getFlattenedActions (actionData) {
        return this.flattenedActions.filter(flattenedAction => flattenedAction.id === actionData.id)
    }

    /**
     * Get actions as Tagify entries for dialogs
     * @param {object} nestId The subcategory data
     * @returns {array}       The actions
     */
    async getAvailableActionsAsTagifyEntries (subcategoryData) {
        if (!this.actionList) return
        const actions = this.availableActions.map(action => this._toTagifyEntry(action))
        return actions
    }

    /**
     * Get selected actions as Tagify entries for dialogs
     * @param {object} subcategoryData The subcategory data
     * @returns {array}                The actions
     */
    async getSelectedActionsAsTagifyEntries (subcategoryData) {
        if (!this.actionList) return
        const subcategory = await Utils.getSubcategoryByNestId(this.actionList.categories, subcategoryData)
        const actions = subcategory.actions
            .filter(action => action.selected === true)
            .map(action => this._toTagifyEntry(action))
        return actions
    }

    /**
     * Register default categories from the Token Action Hud system module
     * @public
     */
    async registerDefaultCategories () {}

    /**
     * Add info to subcategory
     * @param {string} subcategoryData The subcategory data
     */
    addSubcategoryInfo (subcategoryData) {
        const subcategoryId = subcategoryData?.id
        const subcategoryInfo = subcategoryData?.info

        if (!subcategoryId || !subcategoryInfo) return

        const matchingSubcategories = this.categoryManager.getFlattenedSubcategories(subcategoryData)

        matchingSubcategories.forEach(matchingSubcategory => {
            matchingSubcategory.info1 = subcategoryInfo.info1
            matchingSubcategory.info2 = subcategoryInfo.info2
            matchingSubcategory.info3 = subcategoryInfo.info3
        })
    }

    /**
     * Add subcategory to the action list
     * @public
     * @param {object} parentSubcategoryData The parent subcategory data
     * @param {object} subcategoryData       The subcategory data
     */
    async addSubcategoryToActionList (parentSubcategoryData, subcategoryData) {
        const parentSubcategoryId = parentSubcategoryData?.id

        // Exit if no parentSubcategoryId exists
        if (!parentSubcategoryId) return

        const parentSubcategories = this.categoryManager.getFlattenedSubcategories({ ...parentSubcategoryData, level: SUBCATEGORY_LEVEL.SUBCATEGORY })

        // Exit if no parent subcategories exist
        if (!parentSubcategories) return

        // Iterate parent subcategories
        for (const parentSubcategory of parentSubcategories) {
            // Set the subcategory nestId
            const subcategoryNestId = `${parentSubcategory.nestId}_${subcategoryData.id}`

            // Get existing subcategory
            const existingSubcategory = this.categoryManager.getFlattenedSubcategories({ ...subcategoryData, nestId: subcategoryNestId })

            if (existingSubcategory.length) continue
            // Create a new subcategory
            const subcategory = this.categoryManager.createSubcategory({ ...subcategoryData, nestId: subcategoryNestId })

            // Add subcategory to action list
            parentSubcategory.subcategories.push(subcategory)

            // Add subcategory to the flattenedSubcategories variable
            this.categoryManager.addToFlattenedSubcategories(subcategory)

            // Add subcategory to the derivedSubcategories variable
            this.categoryManager.addToDerivedSubcategories({ ...parentSubcategoryData, nestId: parentSubcategory.nestId }, subcategory)
        }
    }

    /**
     * Add actions to the action list
     * @param {object} actions         The actions
     * @param {object} subcategoryData The subcategory data
     */
    async addActionsToActionList (actions, subcategoryData) {
        // Exit if no actions exist
        if (!actions.length) return

        actions = actions.map(action => this.createAction(action))

        // Add actions to availableActions array
        this.addToAvailableActions(actions)

        // Update existing actions
        for (const action of actions) {
            const flattenedActions = this.getFlattenedActions(action)
            for (const flattenedAction of flattenedActions) {
                const systemSelected = action.systemSelected ?? flattenedAction.systemSelected
                const userSelected = flattenedAction.userSelected ?? action.userSelected
                Object.assign(flattenedAction, this.createAction({ ...action, systemSelected, userSelected }))
            }
        }

        // Exit if no subcategoryId exists
        if (!subcategoryData?.id) return

        // Get subcategories
        const subcategories = this.categoryManager.getFlattenedSubcategories(subcategoryData)

        // Exit if no subcategories found
        if (!subcategories) return

        for (const subcategory of subcategories) {
            // Get saved subcategory
            const nestId = subcategory.nestId
            const type = subcategory.type
            const savedSubcategory = await Utils.getSubcategoryByNestId(this.savedActorActionList, { nestId, type })

            // Get existing actions
            const existingActions = subcategory.actions ?? []

            // Get saved actions
            const savedActions = savedSubcategory?.actions ?? []

            const reorderedActions = []

            // Loop the previously saved actions in the subcategory
            for (const savedAction of savedActions) {
                const action = actions.find((action) => action.id === savedAction.id)
                const existingAction = existingActions.find(action => action.id === savedAction.id)
                if (action) {
                    const systemSelected = action.systemSelected ?? savedAction.systemSelected
                    if (existingAction) {
                        const userSelected = existingAction.userSelected ?? savedAction.userSelected ?? action.userSelected
                        Object.assign(existingAction, this.createAction({ ...action, isPreset: true, systemSelected, userSelected }))
                    } else {
                        const userSelected = savedAction.userSelected ?? action.userSelected
                        reorderedActions.push(this.createAction({ ...action, isPreset: true, systemSelected, userSelected }))
                    }
                } else {
                    if (existingAction && existingAction.isPreset) {
                        const systemSelected = false
                        const userSelected = existingAction.userSelected ?? savedAction.userSelected
                        Object.assign(existingAction, this.createAction({ ...existingAction, systemSelected, userSelected }))
                    }
                }
            }
            // Loop the generated actions and add any not previously saved
            for (const action of actions) {
                const savedAction = savedActions.find((savedAction) => savedAction.id === action.id)
                if (!savedAction) reorderedActions.push(this.createAction({ ...action, isPreset: true }))
            }

            // Update action list
            subcategory.actions.push(...reorderedActions)
        }
    }

    /**
     * Set character limit for action names based on 'Character per Word' advanced category option
     * @private
     */
    async _setCharacterLimit () {
        // Get categories
        const categories = this.categoryManager.getFlattenedSubcategories({ level: 'category' })

        // Loop categories
        for (const category of categories) {
            // Get category character limit
            const categoryCharacterCount = category?.advancedCategoryOptions?.characterCount

            // Get subcategories within category
            const subcategories = this.categoryManager.getFlattenedSubcategories({ nestId: category.nestId, level: 'subcategory' })

            // Loop subcategories
            for (const subcategory of subcategories) {
                // Get actions
                const actions = subcategory.actions

                // Exit if no actions exist
                if (actions.length === 0) continue

                // If subcategory also has a character limit set, use it as the character limit
                const subcategoryCharacterCount = subcategory?.advancedCategoryOptions?.characterCount
                const characterCount = (subcategoryCharacterCount >= 0) ? subcategoryCharacterCount : categoryCharacterCount

                // Exit if character limit is not defined
                if ((!characterCount && characterCount !== 0) || !(characterCount >= 0)) continue

                // Loop actions
                for (const action of actions) {
                    if (action.name.length <= characterCount) continue
                    if (characterCount === 0) {
                        action.name = ''
                        continue
                    }
                    // Set each word to the character limit
                    action.name = action.name
                        .split(' ')
                        .map(word => word.slice(0, characterCount))
                        .join(' ')
                }
            }
        }
    }

    /**
     * Save the action list to the actor flag
     * @private
     * @param {object} character The actor and/or token
     */
    async _saveActorActionList (character) {
        Logger.debug('Saving actor action list...', { character })
        if (!character?.actor) return
        const actor = character.actor
        const categories = Utils.deepClone(this.actionList.categories)
        await actor.setFlag(MODULE.ID, 'categories', categories)
        Logger.debug('Actor action list saved', { actionList: this.actionList, character })
    }

    /**
     * Save selected actions from dialog
     * @public
     * @param {array} selectedActions  The selected actions
     * @param {object} subcategoryData The subcategory data
     */
    async saveActions (selectedActions, subcategoryData) {
        // Get nested subcategory
        const subcategory = await Utils.getSubcategoryByNestId(this.actionList.categories, subcategoryData)

        // Get actions from subcategory
        const actions = subcategory.actions

        const reorderedActions = []

        // Set 'selected' to true for selected actions
        // Reorder actions based on order in dialog
        for (const selectedAction of selectedActions) {
            if (selectedAction.id.includes('itemMacro')) continue
            const action = this.availableActions.find((action) => action.encodedValue === selectedAction.id)
            if (action) {
                const actionClone = { ...action, userSelected: true }
                reorderedActions.push(actionClone)
            }
        }
        // Set 'selected' to false for unselected actions
        for (const action of actions) {
            if (!action.id) continue
            if (action.id.includes('itemMacro')) continue
            const selectedAction = selectedActions.find(selectedAction => selectedAction.id === action.encodedValue)
            if (!selectedAction && action.isPreset) {
                const actionClone = { ...action, userSelected: false }
                reorderedActions.push(actionClone)
            }
        }

        // Replace subcategory actions
        subcategory.actions = reorderedActions

        // Save action list
        await this._saveActorActionList(this.character)
    }

    /**
     * Add further action handler
     * @param {object} handler The handler
     */
    addFurtherActionHandler (handler) {
        Logger.debug('Adding further action handler...', { handler })
        this.furtherActionHandlers.push(handler)
    }

    /**
     * Convert into Tagify entry
     * @param {object} data The data
     * @returns {object}    Tagify entry
     */
    _toTagifyEntry (data) {
        return {
            id: data.encodedValue,
            value: data.listName ?? data.name,
            name: data.name,
            type: 'action',
            level: 'action'
        }
    }

    /**
     * Sort items
     * @param {object} items The items
     * @returns {object}     The sorted items
     */
    sortItems (items) {
        return new Map([...items.entries()].sort((a, b) => a[1].sort.localeCompare(b[1].sort)))
    }

    /**
     * Sort items by name
     * @param {object} items The items
     * @returns {object}     The sorted items
     */
    sortItemsByName (items) {
        return new Map([...items.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)))
    }
}
