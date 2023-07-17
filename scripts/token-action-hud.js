import { TagDialogHelper } from './dialogs/tag-dialog-helper.js'
import { CategoryResizer } from './category-resizer.js'
import { DataHandler } from './data-handler.js'
import { CSS_STYLE, SETTING, TEMPLATE } from './constants.js'
import { Logger, Timer, Utils } from './utils.js'

/**
 * Token Action HUD application
 */
export class TokenActionHud extends Application {
    // Set defaults
    hoveredGroups = []
    defaults = {}
    defaultHeight = 200
    defaultWidth = 20
    defaultLeftPos = 150
    defaultTopPos = 80
    leftPos = this.defaultLeftPos
    topPos = this.defaultTopPos
    defaultScale = 1
    refreshTimeout = null
    rendering = false
    tokens = null
    isUpdatePending = false
    isUpdating = false
    updateTimer = new Timer(10)

    constructor (module, systemManager) {
        super()
        this.module = module
        this.systemManager = systemManager
        this.autoDirection = 'down'
        this.directionSetting = 'down'
        this.alwaysShowSetting = false
        this.clickOpenCategorySetting = false
        this.isCollapsed = false
        this.enableCustomizationSetting = false
        this.dragSetting = 'whenUnlocked'
        this.enableSetting = false
        this.isHudEnabled = false
        this.gridSetting = false
        this.isUnlocked = false
        this.styleSetting = null
    }

    /**
     * Initialise the HUD
     * @public
     */
    async init () {
        this.activeCssAsTextSetting = Utils.getSetting('activeCssAsTextSetting')
        this.allowSetting = Utils.getSetting('allow')
        this.alwaysShowSetting = Utils.getSetting('alwaysShowHud')
        this.clickOpenCategorySetting = Utils.getSetting('clickOpenCategory')
        this.customLayoutSetting = Utils.getSetting('customLayout')
        this.directionSetting = Utils.getSetting('direction')
        this.debugSetting = Utils.getSetting('debug')
        this.displayIconsSetting = Utils.getSetting('displayIcons')
        this.dragSetting = Utils.getSetting('drag')
        this.enableCustomizationSetting = Utils.getSetting('enableCustomization')
        this.enableSetting = Utils.getSetting('enable')
        this.gridSetting = Utils.getSetting('grid')
        this.scaleSetting = Utils.getSetting('scale')
        this.styleSetting = Utils.getSetting('style')

        this.isCollapsed = Utils.getUserFlag('isCollapsed')
        this.isHudEnabled = this.#getHudEnabled()
        this.hudPosition = Utils.getUserFlag('position')
        this.isUnlocked = Utils.getUserFlag('isUnlocked')

        await this.systemManager.registerDefaultFlags()

        this.actionHandler = await this.systemManager.getActionHandler()

        if (this.customLayoutSetting && Utils.isGmActive()) {
            this.actionHandler.customLayout = await DataHandler.getDataAsGm({ file: this.customLayoutSetting })
        }
        this.actionHandler.enableCustomizationSetting = this.enableCustomizationSetting
        this.actionHandler.displayCharacterNameSetting = Utils.getSetting('displayCharacterName')
        this.actionHandler.tooltipsSetting = Utils.getSetting('tooltips')

        this.categoryResizer = new CategoryResizer()
        this.rollHandler = this.systemManager.getRollHandler()
    }

    /**
     * Update Token Action HUD following change to module settings
     * @public
     */
    async updateSettings (setting, value = null) {
        if (!this.updateSettingsPending) {
            this.updateSettingsPending = true
            Logger.debug('Updating settings...')
        }

        const variable = SETTING[setting].variable
        if (variable) this[variable] = value

        switch (setting) {
        case 'allow':
        case 'enable':
            this.isHudEnabled = this.#getHudEnabled()
            break
        case 'customLayout':
            if (this.customLayoutSetting && Utils.isGmActive()) {
                this.actionHandler.customLayoutSetting = this.customLayoutSetting
                this.actionHandler.customLayout = await DataHandler.getDataAsGm({ file: this.customLayoutSetting })
            } else {
                this.actionHandler.customLayoutSetting = null
                this.actionHandler.customLayout = null
            }
            break
        case 'enableCustomization':
            this.actionHandler.enableCustomizationSetting = value
            break
        case 'rollHandler':
            this.updateRollHandler()
            break
        case 'tooltips':
            this.actionHandler.tooltipsSetting = value
        }
    }

    /**
     * Update the RollHandler
     * @public
     */
    updateRollHandler () {
        this.rollHandler = this.systemManager.getRollHandler()
    }

    /**
     * Set the tokens variable
     * @public
     * @param {object} tokens Tokens on the canvas
     */
    setTokens (tokens) {
        this.tokens = tokens
    }

    /**
     * Merge Token Action Hud's default options with Application
     * @override
     */
    static get defaultOptions () {
        return mergeObject(super.defaultOptions, {
            template: TEMPLATE.hud,
            id: 'token-action-hud',
            classes: [],
            width: this.defaultWidth,
            height: this.defaultHeight,
            left: this.defaultLeftPos,
            top: this.defaultTopPos,
            scale: this.defaultScale,
            background: 'none',
            popOut: false,
            minimizable: false,
            resizable: false,
            title: 'token-action-hud',
            dragDrop: [],
            tabs: [],
            scrollY: [],
            zIndex: 100
        })
    }

    /**
     * Whether the HUD can be dragged
     * @returns {boolean} Whether the HUD can be dragged
     */
    #isDraggable () {
        return ((this.dragSetting === 'always') || (this.dragSetting === 'whenUnlocked' && this.isUnlocked))
    }

    /**
     * Get Token Action Hud scale
     * @private
     * @returns {number} The scale
     */
    #getScale () {
        const scale = parseFloat(this.scaleSetting)
        if (scale < 0.5) return 0.5
        if (scale > 2) return 2
        return scale
    }

    /**
     * Get data
     * @override
     */
    getData (options = {}) {
        const data = super.getData()
        data.hud = this.hud
        data.id = 'token-action-hud'
        data.style = CSS_STYLE[this.styleSetting].class
        data.scale = this.#getScale()
        data.background = '#00000000'
        Logger.debug('Application data', { data })

        return data
    }

    /**
     * Activate listeners
     * @override
     */
    activateListeners (html) {
        const elements = {
            action: html.find('.tah-action'),
            buttons: html.find('#tah-buttons'),
            tabGroup: html.find('.tah-tab-group'),
            groups: html.find('#tah-groups'),
            editHudButton: html.find('#tah-edit-hud'),
            listGroups: html.find('.tah-list-groups'),
            group: html.find('.tah-group'),
            subtitle: html.find('.tah-subtitle'),
            groupButton: html.find('.tah-group-button'),
            collapseHudButton: html.find('#tah-collapse-hud'),
            expandHudButton: html.find('#tah-expand-hud'),
            unlockButton: html.find('#tah-unlock'),
            lockButton: html.find('#tah-lock')
        }

        // Bind event listeners
        this.#bindGroupEvents(elements)
        this.#bindActionEvents(elements)
        this.#bindEditHudButton(elements)
        this.#bindLockUnlockButtons(elements)
        this.#bindCollapseExpandButtons(elements)
    }

    /**
     * Post-render HUD
     */
    postRender () {
        this.#applySettings()

        // Resize category
        if (this.hoveredGroups.length) {
            for (const groupId of this.hoveredGroups) {
                const group = document.querySelector(`#${groupId}`)
                this.categoryResizer.resizeCategory(this.actionHandler, group, this.autoDirection, this.gridSetting)
            }
        }
    }

    /**
    * Bind category events
    * @private
    */
    #bindGroupEvents (elements) {
        /**
         * Close the group
         * @param {object} event The event
         */
        const closeGroup = (event) => {
            if (game.tokenActionHud.rendering) return
            const group = (this.clickOpenCategorySetting) ? event.currentTarget.parentElement : event.currentTarget
            group.classList.remove('hover')
            const closestGroupElement = group.closest('.tah-group')
            let sibling = closestGroupElement?.nextElementSibling
            while (sibling) {
                if (sibling.classList.contains('tah-group')) {
                    sibling.classList.remove('tah-hidden')
                }
                sibling = sibling.nextElementSibling
            }
            this.#clearHoveredGroup(group.id)
        }

        /**
         * Open the group
         * @param {object} event The event
         */
        const openGroup = async (event) => {
            const group = (this.clickOpenCategorySetting) ? event.currentTarget.parentElement : event.currentTarget
            group.classList.add('hover')
            const closestGroupElement = group.closest('.tah-group')
            let sibling = closestGroupElement?.nextElementSibling
            while (sibling) {
                if (sibling.classList.contains('tah-group')) {
                    sibling.classList.add('tah-hidden')
                }
                sibling = sibling.nextElementSibling
            }
            this.categoryResizer.resizeCategory(this.actionHandler, group, this.autoDirection, this.gridSetting)
            this.#setHoveredGroup(group.id)
        }

        /**
         * Toggle the group
         * @param {object} event The event
         */
        const toggleGroup = (event) => {
            const group = event.currentTarget.parentElement
            if (group.classList.contains('hover')) {
                closeGroup(event)
            } else {
                const groupElements = group.parentElement.querySelectorAll('.tah-tab-group')
                for (const groupElement of groupElements) {
                    groupElement.classList.remove('hover')
                    this.#clearHoveredGroup(groupElement.id)
                }
                openGroup(event)
            }
            // Remove focus to allow core ESC interactions
            event.currentTarget.blur()
        }

        // Bring HUD to top
        elements.groupButton.on('click', (event) => {
            this.bringToTop()
            // Remove focus to allow core ESC interactions
            event.currentTarget.blur()
        })

        if (this.clickOpenCategorySetting) {
            // When a category button is clicked...
            elements.groupButton.on('click', toggleGroup)
        } else {
            // When a category button is hovered over...
            elements.tabGroup.get().forEach(element => {
                element.addEventListener('touchstart', toggleGroup, { passive: true })
            })
            elements.tabGroup.hover(openGroup, closeGroup)
        }

        // When a category button is clicked and held...
        elements.groupButton.on('mousedown', (event) => this.#dragEvent(event))
        elements.groupButton.get().forEach(element => {
            element.addEventListener('touchstart', (event) => this.#dragEvent(event), { passive: true })
        })

        /**
         * Open the group dialog
         * @param {object} event
         */
        const openGroupDialog = (event) => {
            const target = event.currentTarget
            if (!target?.parentElement?.dataset?.nestId) return

            const nestId = target?.parentElement?.dataset?.nestId
            const name = target?.parentElement?.dataset?.name ?? target.innerText ?? target.outerText
            const level = parseInt(target?.parentElement?.dataset?.level) || null
            const type = target?.parentElement?.dataset?.type

            TagDialogHelper.showGroupDialog(
                this.actionHandler,
                { nestId, name, level, type }
            )
        }

        // When a category button is right-clicked...
        elements.groupButton.on('contextmenu', (event) => {
            if (this.isUnlocked && event.currentTarget.parentElement.dataset.level === '1') {
                openGroupDialog(event)
            }
        })
    }

    /**
     * Bind action events
     * @private
     * @param {object} elements The DOM elements
     */
    #bindActionEvents (elements) {
        /**
         * Handle action event
         * @param {object} event The event
         */
        const handleAction = (event) => {
            let target = event.target

            if (target.tagName !== 'BUTTON') target = event.currentTarget.children[0]
            const value = target.value
            try {
                this.rollHandler.handleActionEvent(event, value, this.actionHandler)
                target.blur()
            } catch (error) {
                Logger.error(event)
            }
        }

        /**
         * Open the Action dialog
         * @param {object} event The event
         */
        const openActionDialog = (event) => {
            const target = (event.target.classList.contains('tah-button-text'))
                ? event.target.closest('.tah-tab-group')
                : event.target.closest('.tah-group')
            if (!target?.dataset?.nestId) return
            const nestId = target?.dataset?.nestId
            const name = event.target.innerText ?? event.target.outerText
            const level = parseInt(target?.dataset?.level) || null
            const type = target?.dataset?.type

            TagDialogHelper.showActionDialog(
                this.actionHandler,
                { nestId, name, level, type }
            )
        }

        /**
         * Collapse/expand group
         * @param {object} event                   The event
         * @param {boolean} enableCustomizationSetting Whether customization is enabled
         */
        const collapseExpandGroup = (event, enableCustomizationSetting) => {
            const target = event.target.classList.contains('tah-subtitle-text')
                ? event.target.parentElement
                : event.target
            const groupElement = target?.closest('.tah-group')
            const nestId = groupElement?.dataset?.nestId
            const tabGroup = target.closest('.tah-tab-group.hover')
            const groupsElement = groupElement?.querySelector('.tah-groups')
            const collapseIcon = target.querySelector('.tah-collapse-icon')
            const expandIcon = target.querySelector('.tah-expand-icon')
            const imageElement = groupElement.querySelector('.tah-list-image')

            const toggleGroupVisibility = () => {
                groupsElement?.classList.toggle('tah-hidden')
                collapseIcon?.classList.toggle('tah-hidden')
                expandIcon?.classList.toggle('tah-hidden')
                imageElement?.classList.toggle('tah-hidden')
            }

            const saveGroupSettings = (collapse) => {
                if (enableCustomizationSetting) {
                    this.actionHandler.saveGroupSettings({ nestId, settings: { collapse } })
                }
            }

            if (groupsElement?.classList.contains('tah-hidden')) {
                toggleGroupVisibility()
                saveGroupSettings(false)
                this.categoryResizer.resizeCategory(this.actionHandler, tabGroup, this.autoDirection, this.gridSetting)
            } else {
                toggleGroupVisibility()
                saveGroupSettings(true)
            }
        }

        // When a subcategory title is right-clicked...
        elements.subtitle.on('contextmenu', (event) => {
            if (this.isUnlocked) openActionDialog(event)
        })

        // When a subcategory title is clicked...
        elements.subtitle.on('click', (event) => {
            if (event.target.classList.contains('tah-button-text')) return
            collapseExpandGroup(event, this.enableCustomizationSetting)
        })

        // When an action is clicked or right-clicked...
        elements.action.on('click contextmenu', (event) => {
            event.preventDefault()
            handleAction(event)
        })

        elements.groupButton.on('contextmenu', (event) => {
            if (this.isUnlocked && event.currentTarget.parentElement.dataset.level !== '1') {
                openActionDialog(event)
            }
        })
    }

    /**
     * Bind 'Edit HUD' button
     * @private
     */
    #bindEditHudButton (elements) {
        // When the 'Edit HUD' button is clicked...
        elements.editHudButton.on('click', (event) => {
            event.preventDefault()
            event = event || window.event
            TagDialogHelper.showHudDialog(this.actionHandler)
        })
    }

    /**
     * Bind lock and unlock buttons
     * @private
     */
    #bindLockUnlockButtons (elements) {
        /**
         * Unlock the HUD
         * @param {object} event
         */
        const unlockHud = async (event) => {
            if (event) {
                event.preventDefault()
            }

            const target = event?.target || elements.unlockButton
            $(target).addClass('tah-hidden')
            elements.editHudButton.removeClass('tah-hidden')
            elements.group.removeClass('tah-hidden')
            elements.groupButton.removeClass('disable-edit')
            elements.groups.addClass('tah-unlocked')
            elements.listGroups.removeClass('tah-hidden')
            elements.lockButton.removeClass('tah-hidden')
            elements.tabGroup.removeClass('tah-hidden')
            elements.subtitle.removeClass('disable-edit tah-hidden')

            if (!this.isUnlocked) {
                await Utils.setUserFlag('isUnlocked', true)
                this.isUnlocked = true
            }
        }

        /**
         * Lock the HUD
         * @param {object} event
         */
        const lockHud = async (event = null) => {
            if (event) {
                event.preventDefault()
            }
            const target = event?.target || elements.lockButton
            $(target).addClass('tah-hidden')
            elements.unlockButton.removeClass('tah-hidden')
            elements.editHudButton.addClass('tah-hidden')
            elements.groups.removeClass('tah-unlocked')
            for (const topGroupElement of elements.tabGroup) {
                const hasActions = (topGroupElement.getElementsByClassName('tah-action').length > 0)
                if (!hasActions) topGroupElement.classList.add('tah-hidden')
            }
            for (const groupElement of elements.group) {
                const hasActions = (groupElement.getElementsByClassName('tah-action').length > 0)
                if (!hasActions) groupElement.classList.add('tah-hidden')
            }
            for (const listGroupsElement of elements.listGroups) {
                const hasActions = (listGroupsElement.getElementsByClassName('tah-action').length > 0)
                if (!hasActions) listGroupsElement.classList.add('tah-hidden')
            }
            for (const subtitleElement of elements.subtitle) {
                const groupElement = subtitleElement.closest('.tah-group')
                if (groupElement?.dataset?.showTitle === 'false') {
                    subtitleElement.classList.add('tah-hidden')
                }
            }
            elements.groupButton.addClass('disable-edit')
            elements.subtitle.addClass('disable-edit')
            if (this.isUnlocked) {
                await Utils.setUserFlag('isUnlocked', false)
                this.isUnlocked = false
            }
        }

        // Set initial lock state
        if (this.isUnlocked && this.enableCustomizationSetting) {
            unlockHud()
        } else {
            lockHud()
        }

        if (!this.enableCustomizationSetting) {
            elements.unlockButton.addClass('tah-hidden')
        }

        // Add event listeners
        elements.unlockButton.on('click', unlockHud)
        elements.lockButton.on('click', lockHud)
    }

    /**
     * Bind collapse and expand buttons
     * @private
     */
    #bindCollapseExpandButtons (elements) {
        /**
         * Collapse the HUD
         * @param {object} event The event
         */
        const collapseHud = (event = null) => {
            if (event) {
                event.preventDefault()
                event = event || window.event
            }
            const target = event?.target || elements.collapseHudButton
            $(target).addClass('tah-hidden')
            elements.expandHudButton.removeClass('tah-hidden')
            elements.groups.addClass('tah-hidden')
            elements.buttons.addClass('tah-hidden')
            if (!this.isCollapsed) {
                Utils.setUserFlag('isCollapsed', true)
                this.isCollapsed = true
            }
        }

        /**
         * Expand the HUD
         * @param {object} event The event
         */
        const expandHud = (event) => {
            event.preventDefault()
            event = event || window.event
            $(event.target).addClass('tah-hidden')
            elements.collapseHudButton.removeClass('tah-hidden')
            elements.groups.removeClass('tah-hidden')
            elements.buttons.removeClass('tah-hidden')
            if (this.isCollapsed) {
                Utils.setUserFlag('isCollapsed', false)
                this.isCollapsed = false
            }
        }

        // Set initial state
        if (this.isCollapsed) { collapseHud() }

        // Add event listeners
        // When the 'Collapse HUD' button is clicked...
        elements.collapseHudButton.on('click', collapseHud)

        // When the 'Expand HUD' Button is clicked...
        elements.expandHudButton.on('click', expandHud)

        // When the 'Expand HUD' button is clicked and held...
        elements.expandHudButton.on('mousedown', (event) => this.#dragEvent(event))
        elements.expandHudButton.get(0).addEventListener('touchstart', (event) => this.#dragEvent(event), { passive: true })
    }

    /**
     * Drag event handler
     * @private
     * @param {object} event The event
     */
    #dragEvent (event) {
        if (!this.#isDraggable()) return

        // Get the main element
        const element = document.getElementById('token-action-hud')

        const clientX = event.clientX ?? event.changedTouches[0].clientX
        const clientY = event.clientY ?? event.changedTouches[0].clientY

        // Initialise positions and starting positions
        let pos1 = 0
        let pos2 = 0
        let pos3 = clientX
        let pos4 = clientY
        const originalElementTop = element.offsetTop
        const originalElementLeft = element.offsetLeft
        let newElementTop = originalElementTop
        let newElementLeft = originalElementLeft

        /**
         * Mouse movement event handler
         * @param {object} event The event
         */
        const mouseMoveEvent = (event) => {
            const clientX = event.clientX ?? event.changedTouches[0].clientX
            const clientY = event.clientY ?? event.changedTouches[0].clientY
            pos1 = pos3 - clientX
            pos2 = pos4 - clientY
            pos3 = clientX
            pos4 = clientY

            // If the mouse has not moved, do not update
            if (pos1 === pos3 && pos2 === pos4) return

            newElementTop = newElementTop - pos2
            newElementLeft = newElementLeft - pos1

            this.topPos = newElementTop

            // Apply styles
            requestAnimationFrame(() => {
                Object.assign(element.style, { left: `${newElementLeft}px`, position: 'fixed', top: `${newElementTop}px` })
            })
        }

        /**
         * Mouse up event handler
         */
        const mouseUpEvent = () => {
            // Remove the mouse move and touch move events
            document.onmousemove = null
            element.ontouchmove = null

            // Remove the mouse up and touch end events
            document.onmouseup = null
            element.ontouchend = null

            // If position has not changed, do not update
            if (newElementTop === originalElementTop && newElementLeft === originalElementLeft) return

            this.topPos = newElementTop

            this.#applySettings()

            // Save the new position to the user's flags
            this.hudPosition = { top: newElementTop, left: newElementLeft }
            Utils.setUserFlag('position', this.hudPosition)

            Logger.debug(`Set position to x: ${newElementTop}px, y: ${newElementLeft}px`)
        }

        // Bind mouse move and touch move events
        document.onmousemove = mouseMoveEvent
        element.ontouchmove = mouseMoveEvent

        // Bind mouse up and touch end events
        document.onmouseup = mouseUpEvent
        element.ontouchend = mouseUpEvent
    }

    /**
     * Get the automatic direction the HUD expands
     * @private
     * @returns {string} The direction
     */
    #getAutoDirection () {
        if (this.directionSetting === 'up' || (this.directionSetting === 'auto' && this.topPos > window.innerHeight / 2)) return 'up'
        return 'down'
    }

    /**
     * Apply settings
     * @private
     */
    #applySettings () {
        this.autoDirection = this.#getAutoDirection()
        if (this.autoDirection === 'up') {
            $(document).find('.tah-groups-container').removeClass('expand-down')
            $(document).find('.tah-groups-container').addClass('expand-up')
            $(document).find('.tah-groups-container').removeClass('expand-down')
            $(document).find('.tah-groups-container').addClass('expand-up')
            $(document).find('#tah-character-name').addClass('tah-hidden')
        } else {
            $(document).find('.tah-groups-container').addClass('expand-down')
            $(document).find('.tah-groups-container').removeClass('expand-up')
            $(document).find('.tah-groups-container').addClass('expand-down')
            $(document).find('.tah-groups-container').removeClass('expand-up')
            $(document).find('#tah-character-name').removeClass('tah-hidden')
        }
    }

    /**
     * Set position of the HUD
     * @public
     */
    setPosition () {
        if (!this.hud) return
        this.#setPositionFromFlag()
        this.#restoreHoveredGroups()
        this.rendering = false
    }

    /**
     * Set the position of the HUD based on user flag
     * @private
     */
    #setPositionFromFlag () {
        if (!this.hudPosition) return

        const defaultLeftPos = this.defaultLeftPos
        const defaultTopPos = this.defaultTopPos

        return new Promise((resolve) => {
            const check = () => {
                const element = document.getElementById('token-action-hud')
                if (element) {
                    element.style.bottom = null
                    this.topPos = this.hudPosition.top < 5 || this.hudPosition.top > window.innerHeight + 5
                        ? defaultTopPos
                        : this.hudPosition.top
                    element.style.top = `${this.topPos}px`
                    this.leftPos = this.hudPosition.left < 5 || this.hudPosition.left > window.innerWidth + 5
                        ? defaultLeftPos
                        : this.hudPosition.left
                    element.style.left = `${this.leftPos}px`
                    element.style.position = 'fixed'
                    resolve()
                } else {
                    setTimeout(check, 10)
                }
            }

            check()
        })
    }

    /**
     * Reset the position of the HUD
     * @public
     */
    async resetPosition () {
        Logger.debug('Resetting position...')
        this.hudPosition = { top: this.defaultTopPos, left: this.defaultLeftPos }
        await Utils.setUserFlag('position', this.hudPosition)
        Logger.debug(`Position reset to x: ${this.defaultTopPos}px, y: ${this.defaultLeftPos}px`)
    }

    /**
     * Set hovered group
     * @private
     * @param {string} groupId The group id
     */
    #setHoveredGroup (groupId) {
        if (this.hoveredGroups.length > 10) { this.hoveredGroups = [] }
        this.hoveredGroups.push(groupId)
    }

    /**
     * Clear hovered group
     * @private
     * @param {string} groupId The group id
     */
    #clearHoveredGroup (groupId) {
        this.hoveredGroups = this.hoveredGroups.filter(id => id !== groupId)
    }

    /**
     * Restore the hovered category state on the HUD
     * @private
     */
    #restoreHoveredGroups () {
        if (!this.hoveredGroups.length) return

        for (const groupId of this.hoveredGroups) {
            const groupElement = $(`#${groupId}`)

            if (!groupElement[0]) continue

            if (this.clickOpenCategorySetting) {
                const button = groupElement.find('.tah-group-button')[0]
                button.click()
            } else {
                groupElement.mouseenter()
            }
        }
    }

    /**
     * Toggle HUD
     * @public
     */
    async toggleHud () {
        const binding = Utils.humanizeBinding('toggleHud')
        if (this.enableSetting) {
            this.#close()
            this.enableSetting = false
            await Utils.setSetting('enable', false)
            Logger.info(game.i18n.format('tokenActionHud.keybinding.toggleHud.disabled', { binding }), true)
        } else {
            this.enableSetting = true
            await Utils.setSetting('enable', true)
            Logger.info(game.i18n.format('tokenActionHud.keybinding.toggleHud.enabled', { binding }), true)
            Hooks.callAll('forceUpdateTokenActionHud')
        }
    }

    /**
     * Copy user's 'groups' flag to others users
     * @public
     * @param {string} fromUserId      The user id to copy from
     * @param {string|array} toUserIds The user ids to copy to
     */
    async copy (fromUserId, toUserIds) {
        if (!game.user.isGM) return

        const isCopied = await this.#copyUserData(fromUserId, toUserIds)
        if (isCopied) {
            Logger.info('HUD copied', true)
        } else {
            Logger.info('Copy HUD failed', true)
        }
    }

    /**
     * Copy user's 'groups' flag to others users
     * @private
     * @param {string} fromUserId      The user id to copy from
     * @param {string|array} toUserIds The user ids to copy to
     */
    async #copyUserData (fromUserId, toUserIds) {
        // Exit if parameters are missing
        if (!fromUserId || !toUserIds.length) return false

        Logger.debug('Copying user data...')

        const fromGroup = await DataHandler.getDataAsGm({ type: 'user', id: fromUserId })

        if (typeof toUserIds === 'string') {
            await DataHandler.saveDataAsGm('user', toUserIds, fromGroup)
        } else if (Array.isArray(toUserIds)) {
            for (const userId of toUserIds) {
                await DataHandler.saveDataAsGm('user', userId, fromGroup)
            }
        }

        Logger.debug('User data copied')
        return true
    }

    /**
     * Reset the HUD
     * @public
     */
    async reset () {
        const d = new Dialog({
            title: Utils.i18n('tokenActionHud.dialog.resetLayout.title'),
            content: `<p>${Utils.i18n('tokenActionHud.dialog.resetLayout.content')}</p>`,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: Utils.i18n('tokenActionHud.dialog.button.yes'),
                    callback: async () => {
                        const customLayoutElement = document.querySelector('#token-action-hud-core-settings input[name=customLayout]')
                        if (customLayoutElement) await this.updateSettings('customLayout', customLayoutElement?.value ?? '')
                        await this.resetUserData()
                        this.resetPosition()
                        Logger.info('Layout reset', true)
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: Utils.i18n('tokenActionHud.dialog.button.no')
                }
            }
        })
        d.render(true)
    }

    /**
     * Reset actor data
     */
    async resetActorData () {
        Logger.debug('Resetting actor data...')

        await DataHandler.saveDataAsGm('actor', this.actor.id, {})
        this.actionHandler.hardResetActionHandler()

        Logger.debug('Actor data reset')

        const trigger = { trigger: { type: 'method', name: 'TokenActionHud#resetActorData' } }
        this.update(trigger)
    }

    /**
     * Reset all actor data
     * @public
     */
    async resetAllActorData () {
        Logger.debug('Resetting all actor data...')

        for (const actor of game.actors) {
            Logger.debug(`Resetting flags for actor [${actor.id}]`, { actor })
            await DataHandler.saveDataAsGm('actor', actor.id, {})
        }
        this.actionHandler.hardResetActionHandler()

        Logger.debug('All actor data reset')

        const trigger = { trigger: { type: 'method', name: 'TokenActionHud#resetAllActorData' } }
        this.update(trigger)
    }

    /**
     * Reset user data
     * @public
     */
    async resetUserData () {
        Logger.debug('Resetting user data...')
        await DataHandler.saveDataAsGm('user', game.userId, {})
        Logger.debug('User data reset')
        this.actionHandler.hardResetActionHandler()
        const trigger = { trigger: { type: 'method', name: 'TokenActionHud#resetUserData' } }
        this.update(trigger)
    }

    /**
     * Reset all user data
     * @public
     */
    async resetAllUserData () {
        Logger.debug('Resetting all user data...')
        for (const user of game.users) {
            await DataHandler.saveDataAsGm('user', user.id, {})
        }
        Logger.debug('All user data reset')
        this.actionHandler.hardResetActionHandler()
        const trigger = { trigger: { type: 'method', name: 'TokenActionHud#resetAllUserData' } }
        this.update(trigger)
    }

    /**
     * Update the HUD
     * @public
     * @param {object} trigger The trigger for the update
     */
    update (trigger = null) {
        this.#updateHud(trigger)
    }

    /**
     * Update the HUD
     * @private
     * @param {object} trigger The trigger for the update
     */
    async #updateHud (trigger) {
        if (trigger?.name === 'closeSettingsConfig' && !this.updateSettingsPending) {
            return
        } else {
            this.updateSettingsPending = false
            Logger.debug('Settings updated')
        }
        if (this.isUpdatePending) await this.updateTimer.abort()
        this.isUpdatePending = true
        await this.updateTimer.start()
        this.isUpdatePending = false
        this.isUpdating = true
        Logger.debug('Updating hud...', trigger)

        const previousActorId = this.actor?.id
        const controlledTokens = Utils.getControlledTokens()
        const character = this.#getCharacter(controlledTokens)

        const multipleTokens = controlledTokens.length > 1 && !character

        if ((!character && !multipleTokens) || !this.isHudEnabled) {
            this.#close()
            this.hoveredGroups = []
            Logger.debug('Hud update aborted as no character(s) found or hud is disabled')
            this.isUpdating = false
            return
        }

        const options = (trigger === 'controlToken' && previousActorId !== this.actor?.id) ? { saveActor: true } : {}

        this.hud = await this.actionHandler.buildHud(options)

        if (this.hud.length === 0) {
            this.#close()
            this.hoveredGroups = []
            Logger.debug('Hud update aborted as action list empty')
            this.isUpdating = false
            return
        }

        this.rendering = true
        this.render(true)
        if (!ui.windows[this.appId]) {
            ui.windows[this.appId] = this
        }
        this.isUpdating = false

        Hooks.callAll('tokenActionHudCoreHudUpdated', this.module)
        Logger.debug('Hud updated')
    }

    /**
     * Close application
     * @private
     */
    #close () {
        this.close()
    }

    /**
     * Whether the token change is valid for a HUD update
     * @public
     * @param {object} token The token
     * @param {object} data  The data
     * @returns {boolean}    Whether the token change is valid for a HUD update
     */
    isValidTokenChange (token, data = null) {
        if (data?.actorData?.flags) return false
        if (this.alwaysShowSetting) {
            return (this.#isRelevantToken(token) || token.actorId === game.user.character?.id)
        } else {
            return this.#isRelevantToken(token)
        }
    }

    /**
     * Whether the token is controlled or on the canvas
     * @private
     * @param {object} token The token
     * @returns {boolean} Whether the token is controlled or on the canvas
     */
    #isRelevantToken (token) {
        const controlledTokens = Utils.getControlledTokens()
        return (
            controlledTokens?.some((controlledToken) => controlledToken.id === token.id) ||
            (
                controlledTokens?.length === 0 &&
                canvas?.tokens?.placeables?.some((token) => token.id === this.hud?.tokenId)
            )
        )
    }

    /**
     * Whether the actor or item update is valid for a HUD update
     * @param {object} actor The actor
     * @param {object} data  The data
     * @returns {boolean}    Whether the actor or item update is valid for a HUD update
     */
    isValidActorOrItemUpdate (actor, data) {
        if (!this.isSelectedActor(actor)) return false

        if (actor) {
            if (!actor) {
                Logger.debug('No actor, update hud', { data })
                return true
            }

            if (this.hud && actor.id === this.hud.actorId) {
                Logger.debug('Same actor, update hud', { actor, data })
                return true
            }

            Logger.debug('Different actor, do not update hud', { actor, data })
            return false
        }
    }

    /**
     * Whether the given actor is the selected actor
     * @param {object} actor The actor
     * @returns {boolean}    Whether the given actor is the selected actor
     */
    isSelectedActor (actor) {
        if (!actor?.id) return true
        if (actor?.id === this.actor?.id) return true
        return false
    }

    /**
     * Whether the hud is enabled for the current user
     * @private
     * @returns {boolean} Whether the hud is enabled for the current user
     */
    #getHudEnabled () {
        const userRole = game.user.role
        const isGM = game.user.isGM
        const isEnabled = this.enableSetting

        if (!isEnabled) return false

        if (isGM) return true

        return Utils.checkAllow(userRole, this.allowSetting)
    }

    /**
     * Whether the compendium is linked
     * @public
     * @param {string} id The compendium id
     * @returns {boolean} Whether the compendium is linked
     */
    isLinkedCompendium (id) {
        Logger.debug('Compendium hook triggered, checking if compendium is linked...')
        return this.actionHandler.isLinkedCompendium(id)
    }

    /**
     * Get character from selected tokens
     * @private
     * @param {array} [controlled = []] The controlled tokens
     */
    #getCharacter (controlled = []) {
        if (controlled.length > 1) {
            this.actor = null
            this.token = null
            this.actionHandler.characterName = 'Multiple'
            this.actionHandler.actor = null
            this.actionHandler.token = null
            this.rollHandler.actor = null
            this.rollHandler.token = null
            return null
        }

        const character = { token: null, actor: null }
        if (controlled.length === 1) {
            const token = controlled[0]
            const actor = token.actor

            if (!this.#isValidCharacter(token)) return null

            character.token = token
            character.actor = actor
        } else if (controlled.length === 0 && game.user.character && this.alwaysShowSetting) {
            character.actor = game.user.character
            character.token = canvas.tokens.placeables.find(t => t.actor?.id === character.actor.id)
        }

        if (!character.actor) return null

        this.actor = character.actor
        this.token = character.token
        this.actionHandler.characterName = character.token?.name ?? character.actor.name
        this.actionHandler.actor = character.actor
        this.actionHandler.token = character.token
        this.rollHandler.actor = character.actor
        this.rollHandler.token = character.token
        return character
    }

    /**
     * Whether the character is a valid selection for the current user
     * @private
     * @param {object} [token = {}] The token
     * @returns {boolean}           Whether the character is a valid selection for the current user
     */
    #isValidCharacter (token = {}) {
        const actor = token?.actor
        const user = game.user
        return game.user.isGM || actor?.testUserPermission(user, 'OWNER')
    }
}
