import { GenericActionHandler } from './generic-action-handler.js'
import { CompendiumActionHandler } from './compendium-action-handler.js'
import { MacroActionHandler } from './macro-action-handler.js'
import { Logger, getSetting, getSubcategoryByNestId } from '../utilities/utils.js'

export class ActionHandler {
    i18n = (toTranslate) => game.i18n.localize(toTranslate)

    furtherActionHandlers = []
    delimiter = '|'

    constructor (categoryManager) {
        this.categoryManager = categoryManager
        this.flattenedSubcategories = categoryManager.flattenedSubcategories
        this.character = null
        this.genericActionHandler = new GenericActionHandler(this)
        this.compendiumActionHandler = new CompendiumActionHandler(this)
        this.macroActionHandler = new MacroActionHandler(this)
        this.actionList = []
        this.userActionList = []
        this.savedUserActionList = []
        this.savedActorActionList = []
        this.displayIcons = getSetting('displayIcons')
    }

    resetActionHandler () {
        this.genericActionHandler = new GenericActionHandler(this)
        this.compendiumActionHandler = new CompendiumActionHandler(this)
        this.macroActionHandler = new MacroActionHandler(this)
        this.actionList = []
        this.userActionList = []
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
        await this.categoryManager.resetCategoryManager()
        this.character = character
        this.savedUserActionList = await this.getSavedUserActionList(character)
        this.savedActorActionList = await this.getSavedActorActionList(character)
        this.actionList = await this.buildEmptyActionList(character)
        await this.categoryManager.flattenSubcategories(this.actionList)
        await Promise.all([
            this._buildSystemActions(character),
            this._buildGenericActions(character),
            this._buildCompendiumActions(),
            this._buildMacroActions()
        ])
        await this.buildFurtherActions(character)
        await this.categoryManager.saveDerivedSubcategories()
        await this.setCharacterLimit()
        await this.saveActorActionList(character)
        Logger.debug('Action list built', { actionList: this.actionList, character })
        return this.actionList
    }

    /**
     * Get the saved action list from the user flags
     * @param {object} character The actor and token
     * @returns {object} The saved action list
     */
    getSavedUserActionList (character) {
        Logger.debug('Retrieving saved action list from user...', { character })
        const categories = game.user.getFlag('token-action-hud-core', 'categories')
        if (!categories) return []
        const savedUserActionList = deepClone(categories)
        Logger.debug('Action list from user retrieved', { savedUserActionList, character })
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
        const savedActorActionList = deepClone(categories)
        Logger.debug('Action list from actor retrieved', { savedActorActionList, character })
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
        const emptyActionList = {
            hudTitle,
            tokenId,
            actorId,
            categories: []
        }

        const categories = this.savedUserActionList ?? game.user.getFlag('token-action-hud-core', 'default.categories')

        for (const category of categories) {
            // Add category
            emptyActionList.categories.push(this.categoryManager.createCategory(category))

            const lastIndex = emptyActionList.categories.length - 1
            const latestCategory = emptyActionList.categories[lastIndex]

            // addSubcategories function
            const addSubcategories = (latestCategorySubcategory, subcategories) => {
                if (subcategories) {
                    for (const subcategory of subcategories) {
                        latestCategorySubcategory.subcategories.push(this.categoryManager.createSubcategory(subcategory))

                        if (subcategory?.subcategories?.length) {
                            const lastIndex = latestCategorySubcategory.subcategories.length - 1
                            const latestSubcategory = latestCategorySubcategory.subcategories[lastIndex]

                            addSubcategories(latestSubcategory, subcategory.subcategories)
                        }
                    }
                }
            }

            // Add subcategories to category
            addSubcategories(latestCategory, category.subcategories, category.nestId)
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
        const subcategoryIds = this.actionList.categories
            .filter(category => category.subcategories)
            .flatMap(category =>
                category.subcategories
                    .filter(subcategory => subcategory.type === 'system')
                    .flatMap(subcategory => subcategory.id)
            )
        await this.buildSystemActions(character, subcategoryIds)
        Logger.debug('System actions built', { actionList: this.actionList, character })
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
     * Get actions as Tagify entries for dialogs
     * @param {object} nestId The subcategory data
     * @returns {array} A list of actions
     */
    async getActionsAsTagifyEntries (subcategoryData) {
        if (!this.actionList) return
        const subcategory = await getSubcategoryByNestId(this.actionList.categories, subcategoryData)
        const actions = subcategory.actions.map(action => this.toTagifyEntry(action))
        return actions
    }

    /**
     * Get selected actions as Tagify entries for dialogs
     * @param {object} subcategoryData The subcategory data
     * @returns {array} A list of actions
     */
    async getSelectedActionsAsTagifyEntries (subcategoryData) {
        if (!this.actionList) return
        const subcategory = await getSubcategoryByNestId(this.actionList.categories, subcategoryData)
        const actions = subcategory.actions
            .filter(action => action.selected === true)
            .map(action => this.toTagifyEntry(action))
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
     * @param {object} subcategoryData  The subcategory data
     */
    async addSubcategoryToActionList (parentSubcategoryData, subcategoryData) {
        const parentSubcategoryId = parentSubcategoryData?.id

        // Exit if no parentSubcategoryId exists
        if (!parentSubcategoryId) return

        const parentSubcategories = this.categoryManager.getFlattenedSubcategories({ ...parentSubcategoryData, level: 'subcategory' })

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
     * @param {object} actions The actions
     * @param {object} subcategoryData The subcategory data
     */
    async addActionsToActionList (actions, subcategoryData) {
        // Exit if no actions exist
        if (!actions.length) return

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
            const savedSubcategory = await getSubcategoryByNestId(this.savedActorActionList, { nestId, type })

            // Get saved actions
            const savedActions = savedSubcategory?.actions ?? []

            const reorderedActions = []

            // Set 'selected' to saved action 'selected'
            // Reorder actions based on saved action list
            for (const savedAction of savedActions) {
                const action = actions.find((action) => action.encodedValue === savedAction.encodedValue)
                if (action) {
                    const actionClone = { ...action, fullName: action.name, selected: savedAction.selected ?? true }
                    reorderedActions.push(actionClone)
                }
            }
            for (const action of actions) {
                const savedAction = savedActions.find((savedAction) => savedAction.encodedValue === action.encodedValue)
                if (!savedAction) {
                    const actionClone = { ...action, fullName: action.name, selected: true }
                    reorderedActions.push(actionClone)
                }
            }

            // Update action list
            subcategory.actions = reorderedActions
        }
    }

    /**
     * Set character limit for action names based on 'Character per Word' advanced category option
     */
    async setCharacterLimit () {
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
     * @param {object} character The actor and/or token
     */
    async saveActorActionList (character) {
        Logger.debug('Saving actor action list...', { character })
        if (!character?.actor) return
        const actor = character.actor
        const categories = deepClone(this.actionList.categories)
        await actor.setFlag('token-action-hud-core', 'categories', categories)
        Logger.debug('Actor action list saved', { actionList: this.actionList, character })
    }

    /**
     * Save selected actions from dialog
     * @public
     * @param {array} selectedActions The selected actions
     * @param {object} subcategoryData The subcategory data
     */
    async saveActions (selectedActions, subcategoryData) {
        // Get nested subcategory
        const subcategory = await getSubcategoryByNestId(this.actionList.categories, subcategoryData)

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
                const actionClone = { ...action, selected: true }
                reorderedActions.push(actionClone)
            }
        }
        // Set 'selected' to false for unselected actions
        for (const action of actions) {
            const selectedAction = selectedActions.find(selectedAction => selectedAction.id === action.encodedValue)
            if (!selectedAction) {
                const actionClone = { ...action, selected: false }
                reorderedActions.push(actionClone)
            }
        }

        // Replace subcategory actions
        subcategory.actions = reorderedActions

        // Save action list
        await this.saveActorActionList(this.character)
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
     * @returns {object} Tagify entry
     */
    toTagifyEntry (data) {
        return { id: data.encodedValue, value: data.fullName, type: 'action', level: 'action' }
    }

    /**
     * Get image from entity
     * @param {object} entity The entity
     * @param {array} defaultImages Any default images
     * @returns {string} The image
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
     * @returns {object} The sorted items
     */
    sortItems (items) {
        return new Map([...items.entries()].sort((a, b) => a[1].sort.localeCompare(b[1].sort)))
    }

    /**
     * Sort items by name
     * @param {object} items The items
     * @returns {object} The sorted items
     */
    sortItemsByName (items) {
        return new Map([...items.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name)))
    }
}
