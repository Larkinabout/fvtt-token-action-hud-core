import { DataHandler } from '../data-handler.js'
import { GenericActionHandler } from './generic-action-handler.js'
import { CompendiumActionHandler } from './compendium-action-handler.js'
import { MacroActionHandler } from './macro-action-handler.js'
import { COMPENDIUM_PACK_TYPES, DELIMITER, GROUP_TYPE, MODULE } from '../constants.js'
import { Logger, Utils } from '../utilities/utils.js'

/**
 * Handler for building the HUD.
 */
export class ActionHandler {
    characterName = null
    actor = null
    token = null
    furtherActionHandlers = []
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
        this.availableActions = []
        this.displayIcons = Utils.getSetting('displayIcons')
    }

    /**
     * Reset action handler variables
     * @public
     */
    resetActionHandler () {
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
        this.availableActions = []
        this.displayIcons = Utils.getSetting('displayIcons')
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
        this.resetActionHandler()
        await this._getDefaultGroups()
        await this._getDefaultLayout()
        await this._getSavedUserGroups()
        if (this.actor) await this._getSavedActorGroups()
        this.hud = await this._prepareHud()
        await Promise.all([
            this._buildSystemActions(),
            this._buildGenericActions(),
            this._buildCompendiumActions(),
            this._buildMacroActions()
        ])
        await this.buildFurtherActions()
        await this._setHasActions()
        await this._sortAvailableActions()
        await this._setCharacterLimit()
        await this.saveGroups(options)
        Logger.debug('HUD built', { hud: this.hud, actor: this.actor, token: this.token })
        return this.hud
    }

    /**
     * Prepare the HUD
     * @private
     * @returns {object} The HUD
     */
    async _prepareHud () {
        Logger.debug('Preparing HUD...', { actor: this.actor, token: this.token })

        const title = (Utils.getSetting('displayCharacterName'))
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
            const userGroups = this._getUserGroups()
            for (const userGroup of userGroups) {
                if (userGroup.level === 1) {
                    const group = this._createGroup(userGroup)
                    hud.groups.push(group)
                    this.groups[group.nestId] = group
                } else {
                    const parentNestId = userGroup.nestId.split('_', userGroup.level - 1).join('_')
                    const parentGroup = await Utils.getGroupByNestId(hud.groups, { nestId: parentNestId })
                    if (parentGroup) {
                        const group = this._createGroup(userGroup)
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
            const actorGroups = this._getActorGroups()
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
                        const group = this._createGroup(actorGroup)
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
    async _buildSystemActions () {
        Logger.debug('Building system actions...', { actor: this.actor, token: this.token })
        const groupIds = Object.values(this.groups).map(group => group.id)
        await this.buildSystemActions(groupIds)
        Logger.debug('System actions built', { hud: this.hud, actor: this.actor, token: this.token })
    }

    /**
     * Build compendium-specific actions
     * @private
     */
    async _buildCompendiumActions () {
        Logger.debug('Building compendium actions...')
        await this.compendiumActionHandler.buildCompendiumActions()
        Logger.debug('Compendium actions built', { hud: this.hud })
    }

    /**
     * Build generic actions
     * @private
     */
    _buildGenericActions () {
        Logger.debug('Building generic actions...', { actor: this.actor, token: this.token })
        this.genericActionHandler.buildGenericActions()
        Logger.debug('Generic actions built', { hud: this.hud, actor: this.actor, token: this.token })
    }

    /**
     * Build macro-specific actions
     * @private
     */
    async _buildMacroActions () {
        Logger.debug('Building macro actions...')
        await this.macroActionHandler.buildMacroActions()
        Logger.debug('Macro actions built', { hud: this.hud })
    }

    /**
     * Build further actions
     * @private
     */
    async buildFurtherActions () {
        this.furtherActionHandlers.forEach(handler => handler.extendActionList())
    }

    /**
     * Set property to indicate whether a group has actions within it
     */
    async _setHasActions () {
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
    async _getDefaultGroups () {
        const defaultGroups = (game.tokenActionHud.defaults?.groups?.length)
            ? game.tokenActionHud.defaults?.groups
            : game.tokenActionHud.defaults?.subcategories
        if (!defaultGroups) return {}
        for (const defaultGroup of defaultGroups) {
            this.defaultGroups[defaultGroup.id] = defaultGroup
        }
    }

    /**
     * Get the default layout
     * @private
     */
    async _getDefaultLayout () {
        const defaultLayout = (game.tokenActionHud.defaults?.layout?.length)
            ? game.tokenActionHud.defaults?.layout
            : game.tokenActionHud.defaults?.categories
        if (!defaultLayout) return {}
        this.defaultLayout = await Utils.getNestedGroups(defaultLayout)
    }

    /**
     * Get the saved groups from the actor flag
     * @privatet
     */
    async _getSavedActorGroups () {
        if (!this.actor) return new Map()
        Logger.debug('Retrieving groups from actor...', { actor: this.actor })
        const actorGroups = await game.tokenActionHud.socket.executeAsGM('getData', 'actor', this.actor.id) ?? null
        if (!actorGroups) return null
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
    async _getSavedUserGroups () {
        const user = game.user
        Logger.debug('Retrieving groups from user...', { user })
        const userGroups = await game.tokenActionHud.socket.executeAsGM('getData', 'user', user.id) ?? this.defaultLayout
        for (const group of Object.entries(userGroups)) {
            group[1].nestId = group[0]
        }
        this.userGroups = userGroups
        Logger.debug('Groups from user retrieved', { userGroups: this.userGroups, user })
    }

    /**
     * Get first matching action group based on criteria
     * @private
     * @param {object} [data = {}] The search data
     * @returns {array}            The groups
     */
    _getGroup (data = {}) {
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
    _getGroups (data = {}) {
        return Object.values(this.groups).filter(
            group =>
                (!data.id || group.id === data.id) &&
                (!data.nestId || group.nestId.startsWith(data.nestId)) &&
                (!data.type || group.type === data.type) &&
                (!data.level || group.level === data.level) &&
                (!data.isSelected || group.isSelected === data.isSelected)
        )
    }

    /**
     * Get actor-related groups based on criteria
     * @private
     * @param {object} [data = {}] The search data
     * @returns {array}            The groups
     */
    _getActorGroups (data = {}) {
        return Object.values(this.actorGroups)
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
     * Get user-related groups based on criteria
     * @private
     * @param {object} [data = {}] The search data
     * @returns {array}            The groups
     */
    _getUserGroups (data = {}) {
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
    async getGroupSettings (groupData) {
        const group = this._getGroup(groupData)
        return group?.settings ?? null
    }

    /**
     * Save group settings
     * @param {object} groupData The group data
     */
    async saveGroupSettings (groupData) {
        const group = this._getGroup(groupData)
        group.settings = { ...group.settings, ...groupData.settings }
        this.saveGroups({ saveActor: true, saveUser: true })
    }

    /**
     * Create group
     * @private
     * @param {object} groupData The group data
     * @returns {object}         The group
     */
    _createGroup (groupData) {
        const groupDataClone = Utils.deepClone(groupData)
        // New option for 1.1.0 - Define default showTitle for existing data
        if (!groupDataClone?.settings) groupDataClone.settings = {}
        if (typeof groupDataClone?.settings?.showTitle === 'undefined') groupDataClone.settings.showTitle = true
        groupDataClone.subtitleClass = (!groupDataClone?.settings?.showTitle) ? 'tah-hidden' : ''

        const nestIdParts = groupData.nestId.split('_')
        const level = nestIdParts.length ?? 1

        if (level === 1) {
            if (typeof groupDataClone?.settings?.style === 'undefined') groupDataClone.settings.style = 'tab'
            return {
                actions: [],
                cssClass: '',
                groups: { lists: [], tabs: [] },
                id: groupDataClone?.id,
                isSelected: groupDataClone?.isSelected ?? true,
                level: groupDataClone?.level ?? nestIdParts.length ?? 1,
                name: groupDataClone?.name,
                nestId: groupDataClone?.nestId ?? groupDataClone?.id,
                order: groupDataClone.order,
                settings: groupDataClone?.settings ?? { style: 'tab' },
                type: 'custom'
            }
        } else {
            if (typeof groupDataClone?.settings?.style === 'undefined') groupDataClone.settings.style = 'list'
            return {
                id: groupDataClone?.id,
                nestId: groupDataClone?.nestId,
                name: groupDataClone?.name,
                listName: groupDataClone?.listName,
                isSelected: groupDataClone?.isSelected ?? true,
                level: groupDataClone.level ?? level,
                order: groupDataClone.order,
                settings: groupDataClone?.settings ?? { showTitle: true, style: 'list' },
                type: groupDataClone?.type ?? GROUP_TYPE.CUSTOM,
                subtitleClass: groupDataClone?.subtitleClass ?? '',
                info1: groupDataClone?.info1 ?? '',
                info2: groupDataClone?.info2 ?? '',
                info3: groupDataClone?.info3 ?? '',
                groups: { lists: [], tabs: [] },
                actions: []
            }
        }
    }

    /**
     * Update groups
     * @public
     * @param {array|object} groupsData         The groups data
     * @param {object} [parentGroupData = null] The parent group data
     */
    async updateGroups (groupsData, parentGroupData) {
        if (!Array.isArray(groupsData)) groupsData = [groupsData]

        const level = (parentGroupData?.level ?? 0) + 1
        const childGroupData = { level }
        if (parentGroupData?.nestId) childGroupData.nestId = parentGroupData.nestId

        const existingGroups = this._getGroups(childGroupData)

        // Remove any groups that are no longer present
        for (const existingGroup of existingGroups) {
            if (existingGroup.type === 'system-derived') {
                existingGroup.isSelected = false
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
            groupData.isSelected = groupData.isSelected ?? true
            groupData.order = order

            const existingGroup = this._getGroup(groupData)

            if (existingGroup) {
                Object.assign(existingGroup, groupData)
            } else {
                const group = this._createGroup(groupData)
                this.groups[groupData.nestId] = group
            }
            order++
        }

        // Update parent group settings
        if (parentGroupData?.settings) {
            const existingParentGroup = this._getGroup(parentGroupData)
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
        Logger.debug('Saving groups...')
        if (options?.saveActor) await this._saveActorGroups()
        if (options?.saveUser) await this._saveUserGroups()
        Logger.debug('Groups saved', { groups: this.groups })
    }

    /**
     * Save groups to the actor flag
     * @private
     */
    async _saveActorGroups () {
        if (!Object.keys(this.groups).length) return
        Logger.debug('Saving actor groups...')
        const actorGroups = {}
        for (const group of Object.values(this.groups)) {
            actorGroups[group.nestId] = this._getReducedGroupData(group, true)
        }
        await game.tokenActionHud.socket.executeAsGM('saveData', 'actor', this.actor.id, actorGroups)
        Logger.debug('Actor groups saved', { actorGroups })
    }

    /**
     * Save groups to the user flag
     * @private
     */
    async _saveUserGroups () {
        if (!Object.keys(this.groups).length) return
        Logger.debug('Saving user groups...')
        const userGroups = {}
        for (const group of Object.values(this.groups)) {
            if (group.type !== 'system-derived') {
                userGroups[group.nestId] = this._getReducedGroupData(group, false)
            }
        }
        await game.tokenActionHud.socket.executeAsGM('saveData', 'user', game.userId, userGroups)
        Logger.debug('User groups saved', { userGroups })
    }

    /**
     * Get reduced groups data for saving to flags
     * @param {object} groupData    The group data
     * @param {boolean} keepActions Whether to keep action data
     * @returns                     The reduced group data
     */
    _getReducedGroupData (groupData, keepActions = false) {
        const data = {
            id: groupData.id,
            name: groupData.name,
            listName: groupData.listName,
            isSelected: groupData.isSelected,
            level: groupData.level,
            order: groupData.order,
            settings: groupData.settings,
            type: groupData.type
        }
        if (keepActions) {
            data.actions = groupData.actions.map(action => {
                return {
                    id: action.id,
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
    _getActions (actionData) {
        return this.actions.filter(action => action.id === actionData.id)
    }

    /**
     * Create action
     * @private
     * @param {object} actionData The action data
     * @returns {object}          The action
     */
    _createAction (actionData) {
        return {
            encodedValue: actionData.encodedValue,
            id: actionData.id,
            name: actionData.name,
            fullName: actionData.fullName ?? actionData.name,
            listName: actionData.listName ?? actionData.name,
            cssClass: actionData.cssClass ?? '',
            icons: actionData.icon ?? {},
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
            isAction: true,
            isItem: actionData.isitem ?? null,
            isPreset: actionData.isPreset ?? false,
            userSelected: actionData.userSelected ?? true,
            systemSelected: actionData.systemSelected ?? true,
            selected: (!actionData.systemSelected)
                ? false
                : actionData.userSelected ?? actionData.systemSelected ?? true
        }
    }

    /**
     * Update actions
     * @public
     * @param {array} actionsData The actions data
     * @param {object} groupData  The group data
     */
    async updateActions (actionsData, groupData) {
        const group = this._getGroup(groupData)
        const actions = group.actions

        const reorderedActions = []

        // Set 'selected' to true for selected actions
        // Reorder actions based on order in dialog
        for (const actionData of actionsData) {
            if (actionData.id.includes('itemMacro')) continue
            const action = this.availableActions.find(action => action.encodedValue === actionData.id)
            if (action) {
                const actionClone = { ...action, userSelected: true }
                reorderedActions.push(actionClone)
            }
        }
        // Set 'selected' to false for unselected actions
        for (const action of actions) {
            if (!action.id || action?.id.includes('itemMacro')) continue

            const actionData = actionsData.find(actionData => actionData.id === action.encodedValue)
            if (!actionData && action.isPreset) {
                const actionClone = { ...action, userSelected: false }
                reorderedActions.push(actionClone)
            }
        }

        // Sort actions alphabetically
        if (groupData.settings.sort) {
            reorderedActions.sort((a, b) => a.name.localeCompare(b.name))
        }

        // Replace group actions
        group.actions = reorderedActions
    }

    /**
     * Add to available actions
     * @private
     * @param {array} actions The actions
     */
    _addToAvailableActions (actions) {
        for (const action of actions) {
            const existingAction = this.availableActions.find(availableAction => availableAction.id === action.id)
            if (!existingAction) this.availableActions.push(action)
        }
    }

    /**
     * Sort available actions
     * @private
     */
    async _sortAvailableActions () {
        this.availableActions.sort((a, b) => a.listName.localeCompare(b.listName))
    }

    /**
     * Get available actions as Tagify entries
     * @public
     * @param {object} groupData The group data
     * @returns {array}          The available actions
     */
    async getAvailableActions () {
        return this.availableActions.map(action => this._toActionTagifyEntry(action))
    }

    /**
     * Get selected actions as Tagify entries
     * @public
     * @param {object} groupData The group data
     * @returns {array}          The selected actions
     */
    async getSelectedActions (groupData) {
        const group = this._getGroup(groupData)
        if (!group) return
        return group.actions
            .filter(action => action.selected === true)
            .map(action => this._toActionTagifyEntry(action))
    }

    /**
     * Get selected groups as Tagify entries
     * @public
     * @param {object} groupData The group data
     * @returns {object}         The selected groups
     */
    async getSelectedGroups (groupData = {}) {
        groupData.isSelected = true
        groupData.level = (groupData.level || 0) + 1
        const groups = this._getGroups(groupData)
        return groups?.map(group => this._toGroupTagifyEntry(group)) ?? []
    }

    /**
     * Get available groups as Tagify entries
     * @public
     * @param {object} groupData The group data
     * @returns {object}         The groups
     */
    async getAvailableGroups (groupData) {
        const derivedGroups = await this._getDerivedGroups(groupData)
        const systemGroups = await this._getSystemGroups()
        const compendiumGroups = await this._getCompendiumGroups()
        const macroGroups = await this._getMacroGroups()
        return [...derivedGroups, ...systemGroups, ...compendiumGroups, ...macroGroups]
    }

    /**
     * Get compendium groups as Tagify entries
     * @private
     * @returns {object} The compendium groups
     */
    async _getCompendiumGroups () {
        const packs = game.packs.filter(pack =>
            COMPENDIUM_PACK_TYPES.includes(pack.documentName) &&
            (!pack.private || game.user.isGM)
        )
        const groups = packs.map(pack => {
            return {
                id: pack.metadata.id.replace('.', '-'),
                listName: `Group: ${pack.metadata.label}`,
                name: pack.metadata.label,
                type: 'core'
            }
        })
        return groups.map(group => this._toGroupTagifyEntry(group))
    }

    /**
     * Get derived groups as Tagify entries
     * @private
     * @param {object} groupData The group data
     * @returns {object}         The derived groups
     */
    async _getDerivedGroups (groupData) {
        const derivedGroups = this._getGroups({
            nestId: groupData?.nestId,
            type: GROUP_TYPE.SYSTEM_DERIVED
        })
        return derivedGroups?.map(group => this._toGroupTagifyEntry(group)) ?? []
    }

    /**
     * Get macro groups as Tagify entries
     * @private
     * @returns {object} The macro groups
     */
    async _getMacroGroups () {
        return [this._toGroupTagifyEntry({
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
    async _getSystemGroups () {
        return Object.values(this.defaultGroups).map(group => this._toGroupTagifyEntry(group))
    }

    /**
     * Add group to the HUD
     * @public
     * @param {object} groupData         The group data
     * @param {object} parentGroupData   The parent group data
     * @param {boolean} [update = false] Whether to update an existing group
     */
    async addGroup (groupData, parentGroupData, update = false) {
        groupData.type = groupData?.type ?? 'system-derived'
        groupData.style = groupData?.style ?? 'list'

        if (!parentGroupData?.id && !parentGroupData?.nestId) return

        const parentGroups = this._getGroups(parentGroupData)
        if (!parentGroups?.length) return

        for (const parentGroup of parentGroups) {
            const nestId = `${parentGroup.nestId}_${groupData.id}`
            const existingGroups = this._getGroups({ ...groupData, nestId })

            if (existingGroups.length) {
                if (update) {
                    for (const existingGroup of existingGroups) {
                        // Temporary fix until info1-3 properties are grouped into info object
                        if (groupData.info) {
                            Object.assign(groupData, { ...groupData.info })
                            delete groupData.info
                        }

                        Object.assign(existingGroup, { ...groupData })
                    }
                }
            } else {
                const group = this._createGroup({ ...groupData, nestId })
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
    async updateGroup (groupData, parentGroupData = null) {
        groupData.type = groupData?.type ?? 'system-derived'

        const updateExistingGroups = (existingGroups) => {
            for (const existingGroup of existingGroups) {
                // Temporary fix until info1-3 properties are grouped into info object
                if (groupData.info) {
                    Object.assign(groupData, { ...groupData.info })
                    delete groupData.info
                }

                Object.assign(existingGroup, { ...groupData })
            }
        }

        if (parentGroupData) {
            const parentGroups = this._getGroups(parentGroupData)
            for (const parentGroup of parentGroups) {
                const nestId = `${parentGroup.nestId}_${groupData.id}`
                const existingGroups = this._getGroups({ ...groupData, nestId })

                updateExistingGroups(existingGroups)
            }
        } else {
            const existingGroups = this._getGroups(groupData)

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

        const groups = this._getGroups(groupData)
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
    async addGroupInfo (groupData) {
        const groupId = groupData?.id
        const groupInfo = groupData?.info

        if (!groupId || !groupInfo) return

        const groups = this._getGroups(groupData)

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
    async addActions (actionsData, groupData) {
        if (!actionsData.length) return

        // Create actions
        const actions = actionsData.map(actionData => this._createAction(actionData))
        this._addToAvailableActions(actions)

        // Update existing actions
        for (const action of actions) {
            const existingActions = this._getActions(action)
            for (const existingAction of existingActions) {
                const systemSelected = action.systemSelected ?? existingAction.systemSelected
                const userSelected = existingAction.userSelected ?? action.userSelected
                Object.assign(existingAction, this._createAction({ ...action, systemSelected, userSelected }))
            }
        }

        if (!groupData?.id) return

        const groups = this._getGroups(groupData)

        if (!groups) return

        for (const group of groups) {
            // Get existing actions
            const existingActions = group.actions ?? []

            const reorderedActions = []

            // Loop the previously saved actions in the group
            for (const existingAction of existingActions) {
                const action = actions.find(action => action.id === existingAction.id)
                if (action) {
                    const systemSelected = action.systemSelected ?? existingAction.systemSelected
                    const userSelected = existingAction.userSelected ?? action.userSelected
                    Object.assign(existingAction, this._createAction({ ...action, isPreset: true, systemSelected, userSelected }))
                } else if (!existingAction.selected && existingAction.isPreset) {
                    const systemSelected = false
                    Object.assign(existingAction, this._createAction({ ...existingAction, systemSelected }))
                }
            }

            // Loop the generated actions and add any not previously saved
            for (const action of actions) {
                const existingAction = existingActions.find(existingAction => existingAction.id === action.id)
                if (!existingAction) reorderedActions.push(this._createAction({ ...action, isPreset: true }))
            }

            // Sort actions alphabetically
            if (group.settings.sort) {
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
    async _setCharacterLimit () {
        const topLevelGroups = this._getGroups({ level: 1 })

        for (const topLevelGroup of topLevelGroups) {
            const topLevelGroupCharacterCount = topLevelGroup?.settings?.characterCount

            const groups = this._getGroups({ nestId: topLevelGroup.nestId })

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
     * Add further action handler
     * @public
     * @param {object} handler The handler
     */
    addFurtherActionHandler (handler) {
        Logger.debug('Adding further action handler...', { handler })
        this.furtherActionHandlers.push(handler)
    }

    /**
     * Whether the compendium is linked
     * @public
     * @param {string} id
     * @returns {boolean}
     */
    isLinkedCompendium (id) {
        const group = this._getGroup({ id })
        return !!group
    }

    /**
     * Convert group into Tagify entry
     * @private
     * @param {object} data
     * @returns {object}
     */
    _toGroupTagifyEntry (data) {
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
    _toActionTagifyEntry (data) {
        return {
            id: data.encodedValue,
            name: data.name,
            type: 'action',
            value: data.listName ?? data.name
        }
    }

    /** DEPRECATED */

    async addActionsToActionList (actionsData, groupData) {
        globalThis.logger.warn('Token Action HUD | ActionHandler.addActionsToActionList is deprecated. Use ActionHandler.addActions')
        await this.addActions(actionsData, groupData)
    }

    async addSubcategoryInfo (groupData) {
        globalThis.logger.warn('Token Action HUD | ActionHandler.addSubcategoryInfo is deprecated. Use ActionHandler.addGroupInfo')
        this.addGroupInfo(groupData)
    }

    async addSubcategoryToActionList (parentGroupData, groupData, update = false) {
        globalThis.logger.warn('Token Action HUD | ActionHandler.addSubcategoryToActionList is deprecated. Use ActionHandler.addGroup')
        this.addGroup(groupData, parentGroupData, update)
    }

    sortItems (items) {
        globalThis.logger.warn('ActionHandler.sortItems is deprecated. Use Utils.sortItems')
        return Utils.sortItems(items)
    }

    sortItemsByName (items) {
        globalThis.logger.warn('ActionHandler.sortItemsByName is deprecated. Use Utils.sortItemsByName')
        return Utils.sortItemsByName(items)
    }
}
