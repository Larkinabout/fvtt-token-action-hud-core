import { DataHandler } from '../data-handler.js'
import { GenericActionHandler } from './generic-action-handler.js'
import { CompendiumActionHandler } from './compendium-action-handler.js'
import { MacroActionHandler } from './macro-action-handler.js'
import { COMPENDIUM_PACK_TYPES, DELIMITER, GROUP_TYPE } from '../constants.js'
import { Logger, Utils } from '../utils.js'

/**
 * Handler for building the HUD.
 */
export class ActionHandler {
    characterName = null
    actor = null
    token = null
    actionHandlerExtenders = []
    delimiter = DELIMITER

    constructor () {
        this.genericActionHandler = new GenericActionHandler(this)
        this.compendiumActionHandler = new CompendiumActionHandler(this)
        this.macroActionHandler = new MacroActionHandler(this)
        this.hud = []
        this.defaultGroups = {}
        this.defaultLayout = {}
        this.groups = {}
        this.actorGroups = {}
        this.userGroups = {}
        this.actions = []
        this.availableActionsMap = new Map()
        this.customLayoutSetting = Utils.getSetting('customLayout')
        this.userCustomLayoutFlag = Utils.getUserFlag('userCustomLayout')
        this.enableCustomizationSetting = Utils.getSetting('enableCustomization')
        this.displayCharacterNameSetting = Utils.getSetting('displayCharacterName')
        this.sortActionsSetting = Utils.getSetting('sortActions')
        this.tooltipsSetting = Utils.getSetting('tooltips')
    }

    /**
     * Reset action handler variables except actorGroups and userGroups
     * @public
     */
    softResetActionHandler () {
        this.genericActionHandler = new GenericActionHandler(this)
        this.hud = []
        this.defaultGroups = {}
        this.defaultLayout = {}
        this.groups = {}
        this.actions = []
        this.availableActionsMap = new Map()
    }

    /**
     * Reset all action handler variables
     * @public
     */
    hardResetActionHandler () {
        this.softResetActionHandler()
        this.customLayoutSetting = Utils.getSetting('customLayout')
        this.userCustomLayoutFlag = Utils.getUserFlag('userCustomLayout')
        this.customLayout = null
        this.actorGroups = {}
        this.userGroups = {}
    }

    /**
     * Register default categories from the Token Action Hud system module
     * @public
     */
    async registerDefaultCategories () {}

    /**
     * Build the HUD
     * @public
     * @returns {object} The HUD
     */
    async buildHud (options) {
        Logger.debug('Building HUD...', { actor: this.actor, token: this.token })
        if (this.previousActor?.id === this.actor?.id) {
            this.isSameActor = true
        } else {
            this.previousActor = this.actor
            this.isSameActor = false
        }
        this.softResetActionHandler()
        await Promise.all([
            this.#getDefaultGroups(),
            this.#getDefaultLayout(),
            this.#getCustomLayout()
        ])
        if (!DataHandler.canGetData() && !this.isGmInactiveUserNotified) {
            Logger.info('Cannot retrieve HUD layout without GM present', true)
            this.isGmInactiveUserNotified = true
        }
        await Promise.all([
            this.#getSavedUserGroups(),
            this.#getSavedActorGroups()
        ])
        this.hud = await this.#prepareHud()
        await Promise.all([
            this.#buildSystemActions(),
            this.#buildGenericActions(),
            this.#buildCompendiumActions(),
            this.#buildMacroActions()
        ])
        await this.#buildExtendedActions()
        this.#updateNonPresetActions()
        this.#setHasActions()
        this.#setCharacterLimit()
        await this.saveGroups(options)
        Logger.debug('HUD built', { hud: this.hud, actor: this.actor, token: this.token })
        return this.hud
    }

    /**
     * Prepare the HUD
     * @private
     * @returns {object} The HUD
     */
    async #prepareHud () {
        Logger.debug('Preparing HUD...', { actor: this.actor, token: this.token })

        const title = (this.displayCharacterNameSetting)
            ? this.characterName ?? 'Multiple'
            : ''
        const actorId = this.actor?.id ?? 'multi'
        const tokenId = this.token?.id ?? 'multi'
        const hud = {
            title,
            tokenId,
            actorId,
            groups: []
        }

        if (Object.keys(this.userGroups).length) {
            const userGroups = this.#getUserGroups()
            for (const userGroup of userGroups) {
                if (userGroup.level === 1) {
                    const group = this.#createGroup(userGroup)
                    hud.groups.push(group)
                    this.groups[group.nestId] = group
                } else {
                    const parentNestId = userGroup.nestId.split('_', userGroup.level - 1).join('_')
                    const parentGroup = await Utils.getGroupByNestId(hud.groups, { nestId: parentNestId })
                    if (parentGroup) {
                        const group = this.#createGroup(userGroup)
                        if (group.settings.style === 'tab') {
                            parentGroup.groups.tabs.push(group)
                        } else {
                            parentGroup.groups.lists.push(group)
                        }
                        this.groups[group.nestId] = group
                    }
                }
            }
        }

        if (Object.keys(this.actorGroups).length) {
            const actorGroups = this.#getActorGroups()
            for (const actorGroup of actorGroups) {
                const parentNestId = actorGroup.nestId.split('_', actorGroup.level - 1).join('_')
                const existingGroup = await Utils.getGroupByNestId(hud.groups, { nestId: actorGroup.nestId })
                if (existingGroup) {
                    if (actorGroup.actions?.length) {
                        existingGroup.actions = actorGroup.actions
                        this.actions.push(...existingGroup.actions)
                        for (const action of existingGroup.actions) {
                            action.selected = false
                        }
                    }
                } else {
                    const parentGroup = await Utils.getGroupByNestId(hud.groups, { nestId: parentNestId })
                    if (parentGroup && actorGroup.type === 'system-derived') {
                        const group = this.#createGroup(actorGroup)
                        if (actorGroup.actions?.length) {
                            group.actions = actorGroup.actions
                            this.actions.push(...group.actions)
                            for (const action of group.actions) {
                                action.selected = false
                            }
                        }
                        if (group.settings.style === 'tab') {
                            parentGroup.groups.tabs.push(group)
                        } else {
                            parentGroup.groups.lists.push(group)
                        }
                        this.groups[group.nestId] = group
                    }
                }
            }
        }

        Logger.debug('HUD prepared', { hud, actor: this.actor, token: this.token })
        return hud
    }

    /**
     * Placeholder function for the system module
     * @public
     */
    async buildSystemActions (groupIds) {}

    /**
     * Build system-specific actions
     * @private
     */
    async #buildSystemActions () {
        Logger.debug('Building system actions...', { actor: this.actor, token: this.token })
        const groupIds = Object.values(this.groups).map(group => group.id)
        await this.buildSystemActions(groupIds)
        Logger.debug('System actions built', { hud: this.hud, actor: this.actor, token: this.token })
    }

    /**
     * Build compendium-specific actions
     * @private
     */
    async #buildCompendiumActions () {
        Logger.debug('Building compendium actions...')
        await this.compendiumActionHandler.buildCompendiumActions()
        Logger.debug('Compendium actions built', { hud: this.hud })
    }

    /**
     * Build generic actions
     * @private
     */
    #buildGenericActions () {
        Logger.debug('Building generic actions...', { actor: this.actor, token: this.token })
        this.genericActionHandler.buildGenericActions()
        Logger.debug('Generic actions built', { hud: this.hud, actor: this.actor, token: this.token })
    }

    /**
     * Build macro-specific actions
     * @private
     */
    async #buildMacroActions () {
        Logger.debug('Building macro actions...')
        await this.macroActionHandler.buildMacroActions()
        Logger.debug('Macro actions built', { hud: this.hud })
    }

    /**
     * Build extended actions
     * @private
     */
    async #buildExtendedActions () {
        this.actionHandlerExtenders.forEach(async extender => await extender.extendActionHandler())
    }

    /**
     * Update non-preset actions
     * @private
     */
    #updateNonPresetActions () {
        const nonPresetActions = this.actions.filter(action => !action?.isPreset)

        for (const nonPresetAction of nonPresetActions) {
            const availableAction = this.availableActionsMap.get(nonPresetAction.id)

            if (availableAction) {
                const systemSelected = availableAction.systemSelected ?? nonPresetAction.systemSelected
                const userSelected = nonPresetAction.userSelected ?? availableAction.userSelected
                Object.assign(nonPresetAction, this.#createAction({ ...availableAction, systemSelected, userSelected }))
            }
        }
    }

    /**
     * Set property to indicate whether a group has actions within it
     * @private
     */
    #setHasActions () {
        for (const group of Object.values(this.groups)) {
            if (group.actions.some(action => action.selected)) {
                group.hasActions = true
            } else {
                group.hasActions = false
            }
        }
    }

    /**
     * Get the default groups
     * @private
     */
    #getDefaultGroups () {
        const defaultGroups = game.tokenActionHud.defaults?.groups
        if (!defaultGroups) return {}
        for (const defaultGroup of defaultGroups) {
            this.defaultGroups[defaultGroup.id] = defaultGroup
        }
    }

    /**
     * Get the default layout
     * @private
     */
    async #getDefaultLayout () {
        if (Object.keys(this.defaultLayout).length) return
        const defaultLayout = game.tokenActionHud.defaults?.layout
        if (!defaultLayout) return {}
        this.defaultLayout = await Utils.getNestedGroups(defaultLayout)
    }

    /**
     * Get custom layout
     * @private
     */
    async #getCustomLayout () {
        if (this.customLayout) return
        const file = this.userCustomLayoutFlag || this.customLayoutSetting || null
        this.customLayout = (file) ? await DataHandler.getDataAsGm({ file }) : null
    }

    /**
     * Export layout to file
     */
    async exportLayout () {
        const data = await DataHandler.getDataAsGm({ type: 'user', id: game.userId }) ?? this.customLayout ?? this.defaultLayout
        if (data) {
            saveDataToFile(JSON.stringify(data, null, 2), 'text/json', 'token-action-hud-layout.json')
        }
    }

    /**
     * Get the saved groups from the actor flag
     * @private
     */
    async #getSavedActorGroups () {
        if (!this.actor) return

        if (!this.enableCustomizationSetting) {
            this.actorGroups = {}
            return
        }

        if (this.isSameActor && Object.entries(this.actorGroups).length) return

        if (!DataHandler.canGetData()) {
            this.actorGroups = {}
            return
        }

        Logger.debug('Retrieving groups from actor...', { actor: this.actor })
        this.actorGroups = {}
        const actorGroups = await DataHandler.getDataAsGm({ type: 'actor', id: this.actor.id }) ?? null
        if (!actorGroups) return
        for (const group of Object.entries(actorGroups)) {
            group[1].nestId = group[0]
        }
        this.actorGroups = actorGroups
        Logger.debug('Groups from actor retrieved', { actorGroups: this.actorGroups, actor: this.actor })
    }

    /**
     * Get the saved groups from the user flag
     * @private
     */
    async #getSavedUserGroups () {
        const user = game.user
        const layout = this.customLayout ?? this.defaultLayout

        const getUserGroups = (data) => {
            const userGroups = Object.keys(data).length ? data : layout
            for (const group of Object.entries(userGroups)) {
                group[1].nestId = group[0]
            }
            return userGroups
        }

        if (!this.enableCustomizationSetting) {
            this.userGroups = getUserGroups(layout)
            return
        }

        if (Object.entries(this.userGroups).length) return

        if (!DataHandler.canGetData()) {
            this.userGroups = getUserGroups(layout)
            return
        }

        Logger.debug('Retrieving groups from user...', { user })
        this.userGroups = {}
        const savedUserData = await DataHandler.getDataAsGm({ type: 'user', id: user.id }) ?? {}
        this.userGroups = getUserGroups(savedUserData)
        Logger.debug('Groups retrieved from user', { userGroups: this.userGroups, user })
    }

    /**
     * Get first matching action group based on criteria
     * @public
     * @param {object} [data = {}] The search data
     * @returns {array}            The groups
     */
    getGroup (data = {}) {
        if (data?.nestId) {
            return this.groups[data.nestId]
        } else {
            return Object.values(this.groups).find(
                group =>
                    (!data.id || group.id === data.id) &&
                    (!data.type || group.type === data.type) &&
                    (!data.level || group.level === data.level)
            )
        }
    }

    /**
     * Get groups based on criteria
     * @private
     * @param {object} [data = {}] The search data
     * @returns {array}            The groups
     */
    #getGroups (data = {}) {
        return Object.values(this.groups).filter(
            group =>
                (!data.id || group.id === data.id) &&
                (!data.nestId || group.nestId.startsWith(data.nestId)) &&
                (!data.type || group.type === data.type) &&
                (!data.level || group.level === data.level) &&
                (!data.selected || group.selected === data.selected)
        )
    }

    /**
     * Get actor-related groups based on criteria
     * @private
     * @param {object} [data = {}] The search data
     * @returns {array}            The groups
     */
    #getActorGroups (data = {}) {
        return Object.values(this.actorGroups)
            .filter(group =>
                (!data.id || group.id === data.id) &&
                (!data.nestId || group.nestId.startsWith(data.nestId)) &&
                (!data.type || group.type === data.type) &&
                (!data.level || group.level === data.level)
            )
            .sort((a, b) => (a.level - b.level || a.order - b.order))
    }

    /**
     * Get user-related groups based on criteria
     * @private
     * @param {object} [data = {}] The search data
     * @returns {array}            The groups
     */
    #getUserGroups (data = {}) {
        return Object.values(this.userGroups)
            .filter(group =>
                (!data.id || group.id === data.id) &&
                (!data.nestId || group.nestId.startsWith(data.nestId)) &&
                (!data.type || group.type === data.type) &&
                (!data.level || group.level === data.level)
            )
            .sort((a, b) => {
                if (a.level === b.level) {
                    return a.order - b.order
                } else {
                    return a.level - b.level
                }
            })
    }

    /**
     * Get advanced options
     * @public
     * @param {object} groupData The group data
     * @returns {object}         The group settings
     */
    getGroupSettings (groupData) {
        const group = this.getGroup(groupData)
        return group?.settings ?? null
    }

    /**
     * Save group settings
     * @param {object} groupData The group data
     */
    saveGroupSettings (groupData) {
        const group = this.getGroup(groupData)
        group.settings = { ...group.settings, ...groupData.settings }
        this.saveGroups({ saveActor: true, saveUser: true })
    }

    /**
     * Create group
     * @private
     * @param {object} groupData The group data
     * @returns {object}         The group
     */
    #createGroup (groupData, keepData = false) {
        const groupDataClone = Utils.deepClone(groupData)
        const nestIdParts = groupData.nestId.split('_')
        const level = nestIdParts.length ?? 1

        const tooltip = this.#getTooltip(groupData?.tooltip, groupDataClone?.name)

        if (!keepData) {
            groupDataClone.actions = []
            groupDataClone.groups = { lists: [], tabs: [] }
        }

        const defaultSettings = {
            showTitle: true,
            style: (level === 1) ? 'tab' : 'list'
        }

        const groupSettings = groupDataClone.settings || {}
        groupSettings.showTitle ??= defaultSettings.showTitle
        groupSettings.style ??= defaultSettings.style

        groupDataClone.subtitleClass = (groupSettings.showTitle) ? '' : 'tah-hidden'

        const groupSystem = groupDataClone.system || {}

        const commonProps = {
            actions: groupDataClone.actions,
            class: groupDataClone.class || groupDataClone.cssClass || '',
            groups: groupDataClone.groups,
            id: groupDataClone.id,
            info1: groupDataClone.info1 || '',
            info2: groupDataClone.info2 || '',
            info3: groupDataClone.info3 || '',
            level: groupDataClone.level || level || 1,
            listName: groupDataClone.listName || groupDataClone.name,
            name: groupDataClone.name,
            nestId: groupDataClone.nestId || groupDataClone.id,
            order: groupDataClone.order,
            selected: groupDataClone.selected ?? groupDataClone.isSelected ?? groupDataClone.defaultSelected ?? true,
            settings: groupSettings,
            system: groupSystem,
            tooltip,
            type: groupDataClone.type || GROUP_TYPE.CUSTOM
        }

        if (level > 1) {
            commonProps.subtitleClass = groupDataClone.subtitleClass || ''
        }

        return commonProps
    }

    /**
     * Update groups
     * @public
     * @param {array|object} groupsData         The groups data
     * @param {object} [parentGroupData = null] The parent group data
     */
    updateGroups (groupsData, parentGroupData) {
        if (!Array.isArray(groupsData)) groupsData = [groupsData]

        const level = (parentGroupData?.level ?? 0) + 1
        const childGroupData = { level }
        if (parentGroupData?.nestId) childGroupData.nestId = parentGroupData.nestId

        const existingGroups = this.#getGroups(childGroupData)

        // Remove any groups that are no longer present
        for (const existingGroup of existingGroups) {
            if (existingGroup.type === 'system-derived') {
                existingGroup.selected = false
                existingGroup.order = 999
            } else {
                if (!groupsData.find(groupData => groupData.id === existingGroup.id)) {
                    delete this.groups[existingGroup.nestId]
                }
            }
        }

        // Add or update groups
        let order = 0
        for (const groupData of groupsData) {
            groupData.nestId = (parentGroupData?.nestId)
                ? `${parentGroupData.nestId}_${groupData.id}`
                : groupData.id
            groupData.selected = groupData.selected ?? true
            groupData.order = order

            const existingGroup = this.getGroup(groupData)

            if (existingGroup) {
                Object.assign(existingGroup, groupData)
            } else {
                const group = this.#createGroup(groupData)
                this.groups[groupData.nestId] = group
            }
            order++
        }

        // Update parent group settings
        if (parentGroupData?.settings) {
            const existingParentGroup = this.getGroup(parentGroupData)
            if (existingParentGroup) {
                existingParentGroup.settings = parentGroupData.settings
            }
        }
    }

    /**
     * Save groups
     * @public
     */
    async saveGroups (options = { saveActor: false, saveUser: false }) {
        if (!this.enableCustomizationSetting) return
        Logger.debug('Saving groups...')
        if (options?.saveActor) await this.#saveActorGroups()
        if (options?.saveUser) await this.#saveUserGroups()
        Logger.debug('Groups saved', { groups: this.groups })
    }

    /**
     * Save actor groups to file
     * @private
     */
    async #saveActorGroups () {
        if (!this.actor) return
        if (!Object.keys(this.groups).length) return
        Logger.debug('Saving actor groups...')
        const actorGroups = {}
        this.actorGroups = {}
        for (const group of Object.values(this.groups)) {
            this.actorGroups[group.nestId] = group
            actorGroups[group.nestId] = this.#getReducedGroupData(group, true)
        }
        if (DataHandler.canSaveData()) {
            await DataHandler.saveDataAsGm('actor', this.actor.id, actorGroups)

            Logger.debug('Actor groups saved', { actorGroups })
        } else {
            Logger.debug('Actor groups not saved as no GM present')
        }
    }

    /**
     * Save user groups to file
     * @private
     */
    async #saveUserGroups () {
        if (!Object.keys(this.groups).length) return
        Logger.debug('Saving user groups...')
        const userGroups = {}
        this.userGroups = {}
        for (const group of Object.values(this.groups)) {
            if (group.type !== 'system-derived') {
                this.userGroups[group.nestId] = group
                userGroups[group.nestId] = this.#getReducedGroupData(group, false)
            }
        }
        if (DataHandler.canSaveData()) {
            await DataHandler.saveDataAsGm('user', game.userId, userGroups)
            Logger.debug('User groups saved', { userGroups })
        } else {
            Logger.debug('User groups not saved as no GM present')
        }
    }

    /**
     * Get reduced groups data for saving to flags
     * @param {object} groupData    The group data
     * @param {boolean} keepActions Whether to keep action data
     * @returns                     The reduced group data
     */
    #getReducedGroupData (groupData, keepActions = false) {
        const data = {
            id: groupData.id,
            name: groupData.name,
            listName: groupData.listName,
            selected: groupData.selected,
            level: groupData.level,
            order: groupData.order,
            settings: groupData.settings,
            type: groupData.type
        }
        if (keepActions) {
            data.actions = groupData.actions.map(action => {
                return {
                    id: action.id,
                    isPreset: action.isPreset,
                    userSelected: action.userSelected
                }
            })
        }
        return data
    }

    /**
     * Get actions by id
     * @private
     * @param {object} actionData The action data
     * @returns {array}           The actions
     */
    #getActions (actionData) {
        return this.actions.filter(action => action.id === actionData.id)
    }

    /**
     * Get tooltip based on module setting
     * @param {string} tooltip The tooltip
     * @param {string} name    The name
     * @returns {string}       The tooltip
     */
    #getTooltip (tooltip, name) {
        if (this.tooltipsSetting === 'none') return null
        if (this.tooltipsSetting === 'nameOnly') return name
        if (this.tooltipsSetting === 'full' && tooltip) {
            return (tooltip.includes('tah-tooltip-wrapper'))
                ? tooltip
                : `<div class="tah-tooltip-wrapper">${tooltip}</div>`
        }
        return name
    }

    /**
     * Create action
     * @private
     * @param {object} actionData The action data
     * @returns {object}          The action
     */
    #createAction(actionData) {
        const fullName = actionData.fullName ?? actionData.name
        const tooltip = this.#getTooltip(actionData?.tooltip, fullName)

        const infoProps = (info) => {
            return {
                class: info?.class || '',
                icon: info?.icon || '',
                text: info?.text || '',
                title: info?.title || ''
            }
        }

        return {
            encodedValue: actionData.encodedValue,
            id: actionData.id,
            name: actionData.name,
            fullName,
            listName: actionData.listName || actionData.name,
            cssClass: actionData.cssClass || '',
            icons: actionData.icon || {},
            icon1: actionData.icon1 || '',
            icon2: actionData.icon2 || '',
            icon3: actionData.icon3 || '',
            img: actionData.img || '',
            info1: infoProps(actionData.info1),
            info2: infoProps(actionData.info2),
            info3: infoProps(actionData.info3),
            isAction: true,
            isItem: actionData.isitem || null,
            isPreset: actionData.isPreset || false,
            userSelected: actionData.userSelected ?? true,
            systemSelected: actionData.systemSelected ?? true,
            system: actionData.system || {},
            selected: actionData.systemSelected
                ? actionData.userSelected ?? actionData.systemSelected ?? true
                : false,
            tooltip,
            useRawHtmlName: actionData.useRawHtmlName || false
        }
    }

    /**
     * Update actions
     * @public
     * @param {array} actionsData The actions data
     * @param {object} groupData  The group data
     */
    updateActions (actionsData, groupData) {
        const group = this.getGroup(groupData)
        const actions = group.actions

        const reorderedActions = []

        // Set 'selected' to true for selected actions
        // Reorder actions based on order in dialog
        for (const actionData of actionsData) {
            if (actionData.id.includes('itemMacro')) continue
            const existingAction = group.actions.find(action => action.id === actionData.id)
            if (existingAction) {
                const actionClone = { ...existingAction, userSelected: true }
                reorderedActions.push(actionClone)
            } else {
                const availableAction = this.availableActionsMap.get(actionData.id)
                if (availableAction) {
                    const actionClone = { ...availableAction, userSelected: true }
                    reorderedActions.push(actionClone)
                }
            }
        }
        // Set 'selected' to false for unselected actions
        for (const action of actions) {
            if (!action.id || action?.id.includes('itemMacro')) continue

            const actionData = actionsData.find(actionData => actionData.id === action.id)
            if (!actionData && action.isPreset) {
                const actionClone = { ...action, userSelected: false }
                reorderedActions.push(actionClone)
            }
        }

        // Sort actions alphabetically
        if (groupData?.settings?.sort || (typeof groupData?.settings?.sort === 'undefined' && this.sortActionsSetting)) {
            reorderedActions.sort((a, b) => a.name.localeCompare(b.name))
        }

        // Replace group actions
        group.actions = reorderedActions
    }

    /**
     * Add to available actions
     * @private
     * @param {array} actionsMap The actions
     */
    #addToAvailableActions (actionsMap) {
        actionsMap.forEach((action, actionId) => {
            if (!this.availableActionsMap.has(actionId)) this.availableActionsMap.set(actionId, action)
        })
    }

    /**
     * Get available actions as Tagify entries
     * @public
     * @param {object} groupData The group data
     * @returns {array}          The available actions
     */
    getAvailableActions () {
        return [...this.availableActionsMap.values()].map(action => this.#toActionTagifyEntry(action)).sort((a, b) => a.value.localeCompare(b.value))
    }

    /**
     * Get selected actions as Tagify entries
     * @public
     * @param {object} groupData The group data
     * @returns {array}          The selected actions
     */
    getSelectedActions (groupData) {
        const group = this.getGroup(groupData)
        if (!group) return
        return group.actions
            .filter(action => action.selected === true)
            .map(action => this.#toActionTagifyEntry(action))
    }

    /**
     * Get selected groups as Tagify entries
     * @public
     * @param {object} groupData The group data
     * @returns {object}         The selected groups
     */
    getSelectedGroups (groupData = {}) {
        groupData.selected = true
        groupData.level = (groupData.level || 0) + 1
        const groups = this.#getGroups(groupData)
        return groups?.map(group => this.#toGroupTagifyEntry(group)) ?? []
    }

    /**
     * Get available groups as Tagify entries
     * @public
     * @param {object} groupData The group data
     * @returns {object}         The groups
     */
    async getAvailableGroups (groupData) {
        const derivedGroups = await this.#getDerivedGroups(groupData)
        const systemGroups = await this.#getSystemGroups()
        const compendiumGroups = await this.#getCompendiumGroups()
        const macroGroups = await this.#getMacroGroups()
        return [...derivedGroups, ...systemGroups, ...compendiumGroups, ...macroGroups]
    }

    /**
     * Get compendium groups as Tagify entries
     * @private
     * @returns {object} The compendium groups
     */
    #getCompendiumGroups () {
        const packs = game.packs.filter(pack =>
            COMPENDIUM_PACK_TYPES.includes(pack.documentName) &&
            (foundry.utils.isNewerVersion(game.version, '10') ? pack.visible : (!pack.private || game.user.isGM))
        )
        const groups = packs.map(pack => {
            return {
                id: pack.metadata.id.replace('.', '-'),
                listName: `Group: ${pack.metadata.label}`,
                name: pack.metadata.label,
                type: 'core'
            }
        })
        return groups.map(group => this.#toGroupTagifyEntry(group))
    }

    /**
     * Get derived groups as Tagify entries
     * @private
     * @param {object} groupData The group data
     * @returns {object}         The derived groups
     */
    #getDerivedGroups (groupData) {
        const derivedGroups = this.#getGroups({
            nestId: groupData?.nestId,
            type: GROUP_TYPE.SYSTEM_DERIVED
        })
        return derivedGroups?.map(group => this.#toGroupTagifyEntry(group)) ?? []
    }

    /**
     * Get macro groups as Tagify entries
     * @private
     * @returns {object} The macro groups
     */
    #getMacroGroups () {
        return [this.#toGroupTagifyEntry({
            id: 'macros',
            listName: `Group: ${Utils.i18n('tokenActionHud.macros')}`,
            name: Utils.i18n('tokenActionHud.macros'),
            type: 'core'
        })]
    }

    /**
     * Get system groups as Tagify entries
     * @private
     * @returns {object} The system groups
     */
    #getSystemGroups () {
        return Object.values(this.defaultGroups).map(group => this.#toGroupTagifyEntry(group))
    }

    /**
     * Add group to the HUD
     * @public
     * @param {object} groupData         The group data
     * @param {object} parentGroupData   The parent group data
     * @param {boolean} [update = false] Whether to update an existing group
     */
    addGroup (groupData, parentGroupData, update = false) {
        groupData.type = groupData?.type ?? 'system-derived'
        groupData.style = groupData?.style ?? 'list'

        if (!parentGroupData?.id && !parentGroupData?.nestId) return

        const parentGroups = this.#getGroups(parentGroupData)
        if (!parentGroups?.length) return

        for (const parentGroup of parentGroups) {
            const nestId = `${parentGroup.nestId}_${groupData.id}`
            const existingGroups = this.#getGroups({ ...groupData, nestId })

            if (existingGroups.length) {
                if (update) {
                    for (const existingGroup of existingGroups) {
                        // Temporary fix until info1-3 properties are grouped into info object
                        if (groupData.info) {
                            Object.assign(groupData, { ...groupData.info })
                            delete groupData.info
                        }

                        Object.assign(existingGroup, this.#createGroup({ ...existingGroup, ...groupData }, true))
                    }
                } else {
                    for (const existingGroup of existingGroups) {
                        const tooltip = this.#getTooltip(groupData.tooltip, existingGroup.name)
                        Object.assign(existingGroup, { tooltip })
                    }
                }
            } else {
                const group = this.#createGroup({ ...groupData, nestId })
                if (group.settings.style === 'tab') {
                    parentGroup.groups.tabs.push(group)
                } else {
                    parentGroup.groups.lists.push(group)
                }
                this.groups[group.nestId] = group
            }
        }
    }

    /**
     * Update group in the HUD
     * @public
     * @param {object} groupData                The group data
     * @param {object} [parentGroupData = null] The parent group data
     */
    updateGroup (groupData, parentGroupData = null) {
        groupData.type = groupData?.type ?? 'system-derived'

        const updateExistingGroups = (existingGroups) => {
            for (const existingGroup of existingGroups) {
                // Temporary fix until info1-3 properties are grouped into info object
                if (groupData.info) {
                    Object.assign(groupData, { ...groupData.info })
                    delete groupData.info
                }

                Object.assign(existingGroup, this.#createGroup({ ...existingGroup, ...groupData }, true))
            }
        }

        if (parentGroupData) {
            const parentGroups = this.#getGroups(parentGroupData)
            for (const parentGroup of parentGroups) {
                const nestId = `${parentGroup.nestId}_${groupData.id}`
                const existingGroups = this.#getGroups({ ...groupData, nestId })

                updateExistingGroups(existingGroups)
            }
        } else {
            const existingGroups = this.#getGroups(groupData)

            updateExistingGroups(existingGroups)
        }
    }

    /**
     * Remove group from HUD
     * @public
     * @param {object} groupData The group data
     */
    removeGroup (groupData) {
        if (!groupData?.nestId && groupData?.id) {
            Utils.deleteGroupsById(this.hud.groups, groupData.id)
        }

        const groups = this.#getGroups(groupData)
        if (!groups?.length) return

        for (const group of groups) {
            delete this.groups[group.nestId]
            if (groupData?.nestId) {
                Utils.deleteGroupByNestId(this.hud.groups, group.nestId)
            }
        }
    }

    /**
     * Add info to group in the HUD
     * @public
     * @param {string} groupData The group data
     */
    addGroupInfo (groupData) {
        const groupId = groupData?.id
        const groupInfo = groupData?.info

        if (!groupId || !groupInfo) return

        const groups = this.#getGroups(groupData)

        groups.forEach(group => {
            group.info1 = groupInfo.info1
            group.info2 = groupInfo.info2
            group.info3 = groupInfo.info3
        })
    }

    /**
     * Add actions to the HUD
     * @public
     * @param {object} actionsData The actions data
     * @param {object} groupData   The group data
     */
    addActions (actionsData, groupData) {
        if (!actionsData.length) return

        // Create actions
        const actions = new Map(actionsData.map(actionData => [actionData.id, this.#createAction(actionData)]))
        this.#addToAvailableActions(actions)

        if (!groupData?.id) return

        const groups = this.#getGroups(groupData)

        if (!groups) return

        for (const group of groups) {
            // Get existing actions
            const existingActions = new Map(group.actions.map(action => [action.id, action]))

            const reorderedActions = []

            // Loop the previously saved actions in the group
            existingActions.forEach((existingAction, existingActionId) => {
                const action = actions.get(existingActionId)
                if (action) {
                    const systemSelected = action.systemSelected ?? existingAction.systemSelected
                    const userSelected = existingAction.userSelected ?? action.userSelected
                    const selected = (!systemSelected)
                        ? false
                        : userSelected ?? systemSelected ?? true
                    Object.assign(existingAction, { ...action, isPreset: true, selected, systemSelected, userSelected })
                } else if (!existingAction.selected && existingAction.isPreset) {
                    const systemSelected = false
                    Object.assign(existingAction, this.#createAction({ ...existingAction, systemSelected }))
                }
            })

            // Loop the generated actions and add any not previously saved
            actions.forEach((action, actionId) => {
                const existingAction = existingActions.get(actionId)
                if (!existingAction) reorderedActions.push(this.#createAction({ ...action, isPreset: true }))
            })

            // Sort actions alphabetically
            if (groupData?.settings?.sort || (typeof groupData?.settings?.sort === 'undefined' && this.sortActionsSetting)) {
                reorderedActions.sort((a, b) => a.name.localeCompare(b.name))
            }

            // Add actions to group
            group.actions.push(...reorderedActions)
        }
    }

    /**
     * Set character limit for action names based on the 'Character per Word' setting
     * @private
     */
    #setCharacterLimit () {
        const topLevelGroups = this.#getGroups({ level: 1 })

        for (const topLevelGroup of topLevelGroups) {
            const topLevelGroupCharacterCount = topLevelGroup?.settings?.characterCount

            const groups = this.#getGroups({ nestId: topLevelGroup.nestId })

            for (const group of groups) {
                const actions = group.actions

                if (!actions || actions?.length === 0) continue

                const groupCharacterCount = group?.settings?.characterCount
                const characterCount = (groupCharacterCount >= 0)
                    ? topLevelGroupCharacterCount
                    : groupCharacterCount

                // Exit if character limit is not defined
                if ((!characterCount && characterCount !== 0) || characterCount < 0) continue

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
     * Add action handler extender
     * @public
     * @param {object} actioHandlerExtender The action handler extender
     */
    addActionHandlerExtender (actionHandlerExtender) {
        Logger.debug('Adding action handler extender...', { actionHandlerExtender })
        this.actionHandlerExtenders.push(actionHandlerExtender)
    }

    /**
     * Convert group into Tagify entry
     * @private
     * @param {object} data
     * @returns {object}
     */
    #toGroupTagifyEntry (data) {
        return {
            id: data.id,
            name: data.name,
            type: data.type,
            value: data.listName ?? data.name
        }
    }

    /**
     * Convert action into Tagify entry
     * @private
     * @param {object} data The data
     * @returns {object}    Tagify entry
     */
    #toActionTagifyEntry (data) {
        return {
            id: data.id,
            name: data.name,
            type: 'action',
            value: data.listName ?? data.name
        }
    }

    /** DEPRECATED */

    /**
     * Add further action handler
     * @public
     * @param {object} handler The handler
     */
    addFurtherActionHandler (handler) {
        globalThis.logger.warn('Token Action HUD | ActionHandler.addFurtherActionHandler is deprecated. Use ActionHandler.addActionHandlerExtender')
        this.addActionHandlerExtender(handler)
    }
}
