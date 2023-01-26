import { TagDialogHelper } from './dialogs/tag-dialog-helper.js'
import { CategoryResizer } from './utilities/category-resizer.js'
import { MODULE } from './constants.js'
import { Logger, Utils } from './utilities/utils.js'

/**
 * Token Action HUD application
 */
export class TokenActionHud extends Application {
    // Set defaults
    hoveredCategoryId = ''
    defaultHeight = 200
    defaultWidth = 20
    defaultLeftPos = 150
    defaultTopPos = 80
    defaultScale = 1
    refreshTimeout = null
    rendering = false
    tokens = null

    constructor (systemManager) {
        super()
        this.systemManager = systemManager
        this.direction = 'down'
        this.isAlwaysShow = false
        this.isClickOpen = false
        this.isCollapsed = false
        this.isDraggable = false
        this.isEnabled = false
        this.isUnlocked = false
    }

    /**
     * Initialise the HUD
     */
    async init () {
        this.direction = Utils.getSetting('direction')
        this.isAlwaysShow = Utils.getSetting('alwaysShowHud')
        this.isClickOpen = Utils.getSetting('clickOpenCategory')
        this.isCollapsed = Utils.getUserFlag('isCollapsed')
        this.isDebug = Utils.getSetting('debug')
        this.isDraggable = Utils.getSetting('drag')
        this.isEnabled = this.isHudEnabled()
        this.isUnlocked = Utils.getUserFlag('isUnlocked')
        await this.systemManager.registerDefaultFlags()
        this.categoryManager = await this.systemManager.getCategoryManager()
        this.actionHandler = await this.systemManager.getActionHandler(this.categoryManager)
        this.rollHandler = this.systemManager.getRollHandler()
    }

    /**
     * Update Token Action HUD following change to module settings
     */
    updateSettings () {
        Logger.debug('Updating settings...')
        this.updateRollHandler()
        this.direction = Utils.getSetting('direction')
        this.isAlwaysShow = Utils.getSetting('alwaysShowHud')
        this.isClickOpen = Utils.getSetting('clickOpenCategory')
        this.isDebug = Utils.getSetting('debug')
        this.isDraggable = Utils.getSetting('drag')
        this.isEnabled = this.isHudEnabled()
        this.actionHandler.displayIcons = Utils.getSetting('displayIcons')
        Logger.debug('Settings updated')
        const trigger = { trigger: { type: 'method', name: 'TokenActionHud#updateSettings' } }
        this.update(trigger)
    }

    /**
     * Update the RollHandler
     */
    updateRollHandler () {
        this.rollHandler = this.systemManager.getRollHandler()
    }

    /**
     * Set the tokens variable
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
            template: `/modules/${MODULE.ID}/templates/template.hbs`,
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
            scrollY: []
        })
    }

    /**
     * Get Token Action Hud scale
     * @returns {number} The scale
     */
    getScale () {
        const scale = parseFloat(Utils.getSetting('scale'))
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
        data.actions = this.actionList
        data.id = 'token-action-hud'
        data.scale = this.getScale()
        data.background = Utils.getSetting('background') ?? '#00000000'
        Logger.debug('Application data', { data })

        return data
    }

    /**
     * Activate listeners
     * @override
     */
    activateListeners (html) {
        const elements = {
            subtitles: html.find('.tah-subtitle'),
            actions: html.find('.tah-action'),
            categoriesSection: html.find('#tah-categories'),
            editCategoriesButton: html.find('#tah-edit-categories'),
            categories: html.find('.tah-category'),
            subcategories: html.find('.tah-subcategory'),
            titleButtons: html.find('.tah-category-button'),
            buttons: html.find('#tah-buttons'),
            collapseHudButton: html.find('#tah-collapse-hud'),
            expandHudButton: html.find('#tah-expand-hud'),
            unlockButton: html.find('#tah-unlock'),
            lockButton: html.find('#tah-lock')
        }

        // Bind event listeners
        this._bindCategoryEvents(elements)
        this._bindActionEvents(elements)
        this._bindEditCategoriesButton(elements)
        this._bindLockUnlockButtons(elements)
        this._bindCollapseExpandButtons(elements)
    }

    /**
    * Bind category events
    * @private
    */
    _bindCategoryEvents (elements) {
        /**
         * Close the category
         * @param {object} event The event
         */
        const closeCategory = (event) => {
            if (game.tokenActionHud.rendering) return
            const category = (this.isClickOpen) ? event.currentTarget.parentElement : event.currentTarget
            category.classList.remove('hover')
            const id = category.id
            this.clearHoveredCategory(id)
        }

        /**
         * Open the category
         * @param {object} event The event
         */
        const openCategory = (event) => {
            const category = (this.isClickOpen) ? event.currentTarget.parentElement : event.currentTarget
            category.classList.add('hover')
            const id = category.id
            this.setHoveredCategory(id)
            CategoryResizer.resizeCategory(this.categoryManager, category, this.direction)
        }

        /**
         * Toggle the category
         * @param {object} event The event
         */
        const toggleCategory = (event) => {
            const category = event.currentTarget.parentElement
            if (category.classList.contains('hover')) {
                closeCategory(event)
            } else {
                for (const categoryElement of elements.categories) {
                    categoryElement.classList.remove('hover')
                }
                openCategory(event)
            }
        }

        // Bring HUD to top
        elements.titleButtons.on('click', () => this.bringToTop())

        if (this.isClickOpen) {
            // When a category button is clicked...
            elements.titleButtons.on('click', toggleCategory)
        } else {
            // When a category button is hovered over...
            elements.categories.get().forEach(element => {
                element.addEventListener('touchstart', toggleCategory, { passive: true })
            })
            elements.categories.hover(openCategory, closeCategory)
        }

        // When a category button is clicked and held...
        elements.titleButtons.on('mousedown', (event) => this.dragEvent(event))
        elements.titleButtons.get().forEach(element => {
            element.addEventListener('touchstart', (event) => this.dragEvent(event), { passive: true })
        })

        /**
         * Open the Subcategory dialog
         * @param {object} event
         */
        const openSubcategoryDialog = (event) => {
            const target = event.currentTarget
            if (target.value.length === 0) return

            const nestId = target.value
            const name = target.innerText ?? target.outerText
            const type = target?.dataset?.type

            TagDialogHelper.showSubcategoryDialog(
                this.categoryManager,
                { nestId, name, type }
            )
        }

        // When a category button is right-clicked...
        elements.titleButtons.on('contextmenu', (event) => {
            if (this.isUnlocked) openSubcategoryDialog(event)
        })
    }

    /**
     * Bind action events
     * @param {object} elements The DOM elements
     */
    _bindActionEvents (elements) {
        /**
         * Handle action event
         * @param {object} event The event
         */
        const handleAction = (event) => {
            let target = event.target

            if (target.tagName !== 'BUTTON') target = event.currentTarget.children[0]
            const value = target.value
            try {
                this.rollHandler.handleActionEvent(event, value)
                target.blur()
            } catch (error) {
                Logger.error(event)
            }
        }

        /**
         * Open the Action dialog
         * @param {object} event
         */
        const openActionDialog = (event) => {
            const { id, innerText, outerText, dataset } = event.target
            if (!id) return

            const nestId = id
            const name = innerText || outerText
            const type = dataset?.type
            const hasDerivedSubcategories = dataset?.hasDerivedSubcategories

            TagDialogHelper.showActionDialog(
                this.categoryManager,
                this.actionHandler,
                { nestId, name, type, hasDerivedSubcategories }
            )
        }

        // When a subcategory title is clicked or right-clicked...
        elements.subtitles.on('click contextmenu', (event) => {
            if (this.isUnlocked) openActionDialog(event)
        })

        // When an action is clicked or right-clicked...
        elements.actions.on('click contextmenu', (event) => {
            event.preventDefault()
            handleAction(event)
        })
    }

    /**
     * Bind edit categories button
     * @private
     */
    _bindEditCategoriesButton (elements) {
        // When Edit Categories button is clicked...
        elements.editCategoriesButton.on('click', (event) => {
            event.preventDefault()
            event = event || window.event
            TagDialogHelper.showCategoryDialog(this.categoryManager)
        })
    }

    /**
     * Bind lock and unlock buttons
     * @private
     */
    _bindLockUnlockButtons (elements) {
        /**
         * Unlock the hud
         * @param {object} event
         */
        const unlockHud = async (event = null) => {
            if (event) {
                event.preventDefault()
                event = event || window.event
            }
            const target = event?.target || elements.unlockButton
            $(target).addClass('tah-hidden')
            elements.lockButton.removeClass('tah-hidden')
            elements.editCategoriesButton.removeClass('tah-hidden')
            elements.categories.removeClass('tah-hidden')
            elements.subcategories.removeClass('tah-hidden')
            elements.titleButtons.removeClass('disable-edit')
            elements.subtitles.removeClass('disable-edit')
            if (!this.isUnlocked) {
                await Utils.setUserFlag('isUnlocked', true)
                this.isUnlocked = true
            }
        }

        /**
         * Lock the hud
         * @param {object} event
         */
        const lockHud = async (event = null) => {
            if (event) {
                event.preventDefault()
                event = event || window.event
            }
            const target = event?.target || elements.lockButton
            $(target).addClass('tah-hidden')
            elements.unlockButton.removeClass('tah-hidden')
            elements.editCategoriesButton.addClass('tah-hidden')
            for (const categoryElement of elements.categories) {
                const hasActions = (categoryElement.getElementsByClassName('tah-action').length > 0)
                if (!hasActions) $(categoryElement).addClass('tah-hidden')
            }
            for (const subcategoryElement of elements.subcategories) {
                const hasActions = (subcategoryElement.getElementsByClassName('tah-action').length > 0)
                if (!hasActions) $(subcategoryElement).addClass('tah-hidden')
            }
            elements.titleButtons.addClass('disable-edit')
            elements.subtitles.addClass('disable-edit')
            if (this.isUnlocked) {
                await Utils.setUserFlag('isUnlocked', false)
                this.isUnlocked = false
            }
        }

        // Set hud to locked or unlocked
        if (this.isUnlocked) { unlockHud() } else { lockHud() }

        // When the Unlock button is clicked...
        elements.unlockButton.on('click', (event) => unlockHud(event))

        // When the Lock button is clicked...
        elements.lockButton.on('click', (event) => lockHud(event))
    }

    /**
     * Bind collapse and expand buttons
     * @private
     */
    _bindCollapseExpandButtons (elements) {
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
            elements.categoriesSection.addClass('tah-hidden')
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
            elements.categoriesSection.removeClass('tah-hidden')
            elements.buttons.removeClass('tah-hidden')
            if (this.isCollapsed) {
                Utils.setUserFlag('isCollapsed', false)
                this.isCollapsed = false
            }
        }

        // Set initial state
        if (this.isCollapsed) { collapseHud() }

        // When the Collapse Hud button is clicked...
        elements.collapseHudButton.on('click', (event) => collapseHud(event))

        // When the Expand Hud Button is clicked...
        elements.expandHudButton.on('click', (event) => expandHud(event))

        // When the Expand Hud button is clicked and held...
        elements.expandHudButton.on('mousedown', (event) => this.dragEvent(event))
        elements.expandHudButton.get(0).addEventListener('touchstart', (event) => this.dragEvent(event), { passive: true })
    }

    /**
     * Drag event handler
     * @param {*} event The event
     */
    dragEvent (event) {
        if (!this.isDraggable) return

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

            // Save the new position to the user's flags
            Utils.setUserFlag('position', { top: newElementTop, left: newElementLeft })

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
     * Apply Settings
     */
    applySettings () {
        if (Utils.getSetting('direction') === 'up') {
            $(document).find('.tah-subcategories-wrapper').removeClass('expand-down')
            $(document).find('.tah-subcategories-wrapper').addClass('expand-up')
            $(document).find('#tah-character-name').addClass('tah-hidden')
        }
    }

    /**
     * Set hud position
     */
    setPosition () {
        if (!this.actionList) return

        const hudTitle = $(document).find('#tah-character-name')
        if (hudTitle.length > 0) { hudTitle.css('top', -hudTitle[0].getBoundingClientRect().height) }

        const token = canvas?.tokens?.placeables.find(
            (t) => t.id === this.actionList?.tokenId
        )
        this.setPositionFromFlag()
        this.restoreHoveredCategoryState()
        this.rendering = false
    }

    /**
     * Set the hud position based on user flag
     */
    setPositionFromFlag () {
        const pos = Utils.getUserFlag('position')

        if (!pos) return


        const defaultLeftPos = this.defaultLeftPos
        const defaultTopPos = this.defaultTopPos

        return new Promise((resolve) => {
            function check () {
                const element = document.getElementById('token-action-hud')
                if (element) {
                    element.style.bottom = null
                    element.style.top =
            pos.top < 5 || pos.top > window.innerHeight + 5
                ? defaultTopPos + 'px'
                : pos.top + 'px'
                    element.style.left =
            pos.left < 5 || pos.left > window.innerWidth + 5
                ? defaultLeftPos + 'px'
                : pos.left + 'px'
                    element.style.position = 'fixed'
                    resolve()
                } else {
                    setTimeout(check, 30)
                }
            }

            check()
        })
    }

    /**
     * Set the hud position based on the controlled token
     * @param {object} token
     */
    setPositionFromToken (token) {
        return new Promise((resolve) => {
            function check (token) {
                const element = $('#token-action-hud')
                if (element) {
                    element.css('bottom', null)
                    element.css(
                        'left',
                        token.worldTransform.tx +
                        (token.width * canvas.dimensions.size + 55) *
                        canvas.scene._viewPosition.scale + 'px'
                    )
                    element.css('top', token.worldTransform.ty + 0 + 'px')
                    element.css('position', 'fixed')
                    resolve()
                } else {
                    setTimeout(check, 30)
                }
            }

            check(token)
        })
    }

    /**
     * Reset the hud position to default
     */
    async resetPosition () {
        Logger.debug('Resetting position...')
        await Utils.setUserFlag('position', { top: this.defaultTopPos, left: this.defaultLeftPos })
        Logger.debug(`Position reset to x: ${this.defaultTopPos}px, y: ${this.defaultLeftPos}px`)
    }

    /**
     * Set 'hoveredCategoryId'
     * @param {string} categoryId
     */
    setHoveredCategory (categoryId) {
        this.hoveredCategoryId = categoryId
    }

    /**
     * Clear 'hoveredCategoryId'
     * @param {string} categoryId
     */
    clearHoveredCategory (categoryId) {
        if (this.hoveredCategoryId === categoryId) this.hoveredCategoryId = ''
    }

    /**
     * Restore the hovered category state on the hud
     */
    restoreHoveredCategoryState () {
        if (this.hoveredCategoryId === '') return

        const id = `#${this.hoveredCategoryId}`
        const category = $(id)

        if (!category[0]) return

        if (this.isClickOpen) {
            const button = category.find('.tah-category-button')[0]
            button.click()
        } else {
            category.mouseenter()
        }
    }

    /**
     * Reset the hud
     */
    async reset () {
        await this.resetUserFlags()
        this.resetPosition()
    }

    /**
     * Reset actor flags
     */
    async resetActorFlags () {
        await this.categoryManager.resetActorFlags()
        const trigger = { trigger: { type: 'method', name: 'TokenActionHud.resetActorFlags' } }
        this.update(trigger)
    }

    /**
     * Reset user flags
     */
    async resetUserFlags () {
        await this.categoryManager.resetUserFlags()
        this.categoryManager.resetCategoryManager()
        this.actionHandler.resetActionHandler()
        const trigger = { trigger: { type: 'method', name: 'TokenActionHud.resetUserFlags' } }
        this.update(trigger)
    }

    /**
     * Update the hud
     * @param {object} trigger The trigger for the update
     */
    update (trigger = null) {
        this._updateHud(trigger)
    }

    /**
     * Update the hud
     * @param {object} trigger The trigger for the update
     */
    async _updateHud (trigger) {
        Logger.debug('Updating hud...', trigger)
        const controlledTokens = Utils.getControlledTokens()
        const character = this._getCharacter(controlledTokens)

        const multipleTokens = controlledTokens.length > 1 && !character

        if ((!character && !multipleTokens) || !this.isEnabled) {
            this.close()
            Logger.debug('Hud update aborted as no character(s) found or hud is disabled')
            return
        }

        this.actionList = await this.actionHandler.buildActionList(character)

        if (this.actionList.length === 0) {
            this.close()
            Logger.debug('Hud update aborted as action list empty')
            return
        }

        this.rendering = true
        this.render(true)
        Logger.debug('Hud updated')
    }

    /**
     * Whether the token change valid for hud update
     * @param {object} token The token object
     * @param {object} data
     * @returns {boolean}
     */
    isValidTokenChange (token, data = null) {
        if (data?.actorData?.flags) return false
        if (this.isAlwaysShow) {
            return (this.isRelevantToken(token) || token.actorId === game.user.character?.id)
        } else {
            return this.isRelevantToken(token)
        }
    }

    /**
     * Whether the token controlled or on the canvas
     * @param {object} token The token object
     * @returns {boolean}
     */
    isRelevantToken (token) {
        const controlledTokens = Utils.getControlledTokens()
        return (
            controlledTokens?.some((controlledToken) => controlledToken.id === token.id) ||
            (
                controlledTokens?.length === 0 &&
                canvas?.tokens?.placeables?.some((token) => token.id === this.actionList?.tokenId)
            )
        )
    }

    /**
     * Whether the actor or item update valid for hud update
     * @param {object} actor The actor object
     * @param {object} data
     * @returns {boolean}
     */
    isValidActorOrItemUpdate (actor, data) {
        if (data?.flags) {
            Logger.debug('Flags set, do not update hud', { actor, data })
            return false
        }

        if (actor) {
            if (!actor) {
                Logger.debug('No actor, update hud', { data })
                return true
            }

            if (this.actionList && actor.id === this.actionList.actorId) {
                Logger.debug('Same actor, update hud', { actor, data })
                return true
            }

            Logger.debug('Different actor, do not update hud', { actor, data })
            return false
        }
    }

    /**
     * Whether the hud is enabled for the current user
     * @returns {boolean}
     */
    isHudEnabled () {
        const userRole = game.user.role
        const isGM = game.user.isGM
        const isEnabled = Utils.getSetting('enable')

        if (!isEnabled) return false

        if (isGM) return true

        return Utils.checkAllow(userRole)
    }

    /**
     * Whether the hooked compendium is linked
     * @param {string} compendiumKey
     * @returns {boolean}
     */
    isLinkedCompendium (compendiumKey) {
        Logger.debug('Compendium hook triggered, checking if compendium is linked...')
        return this.categoryManager.isLinkedCompendium(compendiumKey)
    }

    /**
     * Get character from selected tokens
     * @private
     */
    _getCharacter (controlled = []) {
        if (controlled.length > 1) return null

        const character = { token: null, actor: null }
        if (controlled.length === 1) {
            const token = controlled[0]
            const actor = token.actor

            if (!this._isValidCharacter(token)) return null

            character.token = token
            character.actor = actor
        } else if (controlled.length === 0 && game.user.character && this.isAlwaysShow) {
            character.actor = game.user.character
            character.token = canvas.tokens.placeables.find(t => t.actor?.id === character.actor.id)
        }

        if (!character.actor) return null

        character.id = character.token?.id ?? character.actor.id
        character.name = character.token?.name ?? character.actor.name
        return character
    }

    /**
     * Whether the character is a valid selection for the current user
     * @private
     */
    _isValidCharacter (token = '') {
        const actor = token.actor
        const user = game.user
        return game.user.isGM || actor?.testUserPermission(user, 'OWNER')
    }
}
