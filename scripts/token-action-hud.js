import Logger from './logger.js'
import TagDialogHelper from './dialogs/tag-dialog-helper.js'
import CategoryResizer from './utilities/category-resizer.js'
import { checkAllow, getSetting } from './utilities/utils.js'

export class TokenActionHud extends Application {
    i18n = (toTranslate) => game.i18n.localize(toTranslate)

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
    }

    /**
     * Initialise the hud
     * @param {object} user The user object
     */
    async init (user) {
        await this.systemManager.registerDefaultFlags()
        this.categoryManager = await this.systemManager.getCategoryManager(user)
        this.actionHandler = await this.systemManager.getActionHandler(user)
        this.rollHandler = this.systemManager.getRollHandler()
    }

    /**
     * Update Token Action Hud change to module settings
     */
    updateSettings () {
        this.updateRollHandler()
        this.update()
    }

    /**
     * Update the Roll Handler
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
            template: '/modules/token-action-hud-core/templates/template.hbs',
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
        const scale = parseFloat(getSetting('scale'))
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
        data.background = getSetting('background') ?? '#00000000'
        Logger.debug('data', data)

        for (const category of data.actions.categories) {
            const advancedCategoryOptions = game.user.getFlag(
                'token-action-hud-core',
                `categories.${category.id}.advancedCategoryOptions`
            )
            if (!advancedCategoryOptions?.compactView) continue

            const characterCount = advancedCategoryOptions.characterCount ?? 2
            if (category.subcategories) subcatRecursion(category)

            function subcatRecursion (category) {
                for (const subcategory of category.subcategories) {
                    for (const action of subcategory.actions) {
                        action.title = action.name

                        if (action.name.length < 2) continue
                        else if (characterCount === 0) action.name = ''
                        else {
                            action.name = action.name
                                .split(' ')
                                .map((p) => p.slice(0, characterCount))
                                .join(' ')
                        }
                    }

                    if (subcategory.subcategories.length) { subcategory.subcategories.forEach((s) => subcatRecursion(s)) }
                }
            }
        }

        return data
    }

    /**
     * Activate listeners
     * @override
     */
    activateListeners (html) {
        const categoriesSection = '#tah-categories'
        const categoryElements = html.find('.tah-category')
        const editCategoriesButton = '#tah-edit-categories'
        const unlockButton = '#tah-unlock'
        const lockButton = '#tah-lock'
        const category = '.tah-category'
        const titleButton = '.tah-title-button'
        const titleButtons = html.find(titleButton)
        const subtitle = '.tah-subtitle'
        const subtitles = html.find(subtitle)
        const action = '.tah-action'
        const collapseHudButton = '#tah-collapse-hud'
        const expandHudButton = '#tah-expand-hud'
        const buttons = '#tah-buttons'

        // SET CLASSES
        // Set hud to collapsed or expanded
        if (game.user.getFlag('token-action-hud-core', 'isCollapsed')) {
            html.find(collapseHudButton).addClass('tah-hidden')
            html.find(expandHudButton).removeClass('tah-hidden')
            html.find(categoriesSection).addClass('tah-hidden')
            html.find(buttons).addClass('tah-hidden')
        }

        // Set hud to locked or unlocked
        if (game.user.getFlag('token-action-hud-core', 'isUnlocked')) {
            html.find(unlockButton).addClass('tah-hidden')
            html.find(lockButton).removeClass('tah-hidden')
            html.find(editCategoriesButton).removeClass('tah-hidden')
            categoryElements.removeClass('tah-hidden')
            titleButtons.removeClass('disable-edit')
            subtitles.removeClass('disable-edit')
        } else {
            for (const categoryElement of categoryElements) {
                const hasActions = (categoryElement.getElementsByClassName('tah-action').length > 0)
                if (!hasActions) $(categoryElement).addClass('tah-hidden')
            }
            titleButtons.addClass('disable-edit')
            subtitles.addClass('disable-edit')
        }

        // REGISTER LISTENERS
        // When a category button is clicked...
        html.find(titleButton).on('click', () => this.bringToTop())

        // When a category button is right-clicked...
        html.find(titleButton).on('contextmenu', (event) => {
            if (game.user.getFlag('token-action-hud-core', 'isUnlocked')) openSubcategoryDialog(event)
        })

        // When a subcategory title is clicked or right-clicked...
        html.find('.tah-subtitle').on('click contextmenu', (event) => {
            if (game.user.getFlag('token-action-hud-core', 'isUnlocked')) openActionDialog(event)
        })

        // When an action is clicked or right-clicked...
        html.find(action).on('mousedown contextmenu', (event) => {
            event.preventDefault()
            handleAction(event)
        })

        // When Edit Categories button is clicked...
        html.find(editCategoriesButton).on('click', (event) => {
            event.preventDefault()
            event = event || window.event
            TagDialogHelper._showCategoryDialog(this.categoryManager)
        })

        if (getSetting('clickOpenCategory')) {
            // When a category button is clicked...
            html.find(titleButton).on('click', toggleCategory)
        } else {
            // When a category button is hovered over...
            html.find(titleButton).on('touchstart', toggleCategory)
            html.find(category).hover(openCategory, closeCategory)
        }

        // When a category button is clicked and held...
        html.find(titleButton).on('mousedown touchstart', (event) => this.dragEvent(event))

        // When the Collapse Hud button is clicked...
        html.find(collapseHudButton).on('click', (event) => collapseHud(event))

        // When the Expand Hud Button is clicked...
        html.find(expandHudButton).on('click', (event) => expandHud(event))

        // When the Expand Hud button is clicked and held...
        html.find(expandHudButton).on('mousedown touchstart', (event) => this.dragEvent(event))

        // When the Unlock button is clicked...
        html.find(unlockButton).on('click', (event) => unlockHud(event))

        // When the Lock button is clicked...
        html.find(lockButton).on('click', (event) => lockHud(event))

        // LISTENER FUNCTIONS
        /**
         * Handle the clicked action
         * @param {object} event
         */
        function handleAction (event) {
            let target = event.target

            if (target.tagName !== 'BUTTON') target = event.currentTarget.children[0]
            const value = target.value
            try {
                game.tokenActionHud.rollHandler.handleActionEvent(event, value)
                target.blur()
            } catch (error) {
                Logger.error(event)
            }
        }

        /**
         * Open the Subcategory dialog
         * @param {object} event
         */
        function openSubcategoryDialog (event) {
            const target = event.target
            if (target.value.length === 0) return

            const id = target.value
            const categoryTitle = target.innerText ?? target.outerText

            TagDialogHelper.showSubcategoryDialog(
                game.tokenActionHud.categoryManager,
                id,
                categoryTitle
            )
        }

        /**
         * Open the Action dialog
         * @param {object} event
         */
        function openActionDialog (event) {
            const target = event.target
            if (target.id.length === 0) return

            const nestId = target.id
            const subcategoryName = target.innerText ?? target.outerText

            TagDialogHelper.showActionDialog(
                game.tokenActionHud.actionHandler,
                nestId,
                subcategoryName
            )
        }

        /**
         * Close the category
         * @param {object} event
         */
        function closeCategory (event) {
            if (game.tokenActionHud.rendering) return
            const category = $(this)[0]
            $(category).removeClass('hover')
            const id = category.id
            game.tokenActionHud.clearHoveredCategory(id)
        }

        /**
         * Open the category
         * @param {object} event
         */
        function openCategory (event) {
            const category = $(this)[0]
            html.find(category).removeClass('hover')
            $(category).addClass('hover')
            const id = category.id
            game.tokenActionHud.setHoveredCategory(id)
            CategoryResizer.resizeHoveredCategory(id)
        }

        /**
         * Toggle the category
         * @param {object} event
         */
        function toggleCategory (event) {
            const category = $(this.parentElement)
            let boundClick
            if ($(category).hasClass('hover')) {
                boundClick = closeCategory.bind(this.parentElement)
                boundClick(event)
            } else {
                for (const categoryElement of categoryElements) {
                    $(categoryElement).removeClass('hover')
                }
                boundClick = openCategory.bind(this.parentElement)
                boundClick(event)
            }
        }

        /**
         * Collapse the hud
         * @param {object} event
         */
        function collapseHud (event) {
            event.preventDefault()
            event = event || window.event
            if (game.user.getFlag('token-action-hud-core', 'isCollapsed')) return
            $(event.target).addClass('tah-hidden')
            html.find(expandHudButton).removeClass('tah-hidden')
            html.find(categoriesSection).addClass('tah-hidden')
            html.find(buttons).addClass('tah-hidden')
            game.user.setFlag('token-action-hud-core', 'isCollapsed', true)
        }

        /**
         * Expand the hud
         * @param {object} event
         */
        function expandHud (event) {
            event.preventDefault()
            event = event || window.event
            $(event.target).addClass('tah-hidden')
            html.find(collapseHudButton).removeClass('tah-hidden')
            html.find(categoriesSection).removeClass('tah-hidden')
            html.find(buttons).removeClass('tah-hidden')
            game.user.setFlag('token-action-hud-core', 'isCollapsed', false)
        }

        /**
         * Unlock the hud
         * @param {object} event
         */
        function unlockHud (event) {
            event.preventDefault()
            event = event || window.event
            $(event.target).addClass('tah-hidden')
            html.find(lockButton).removeClass('tah-hidden')
            html.find(editCategoriesButton).removeClass('tah-hidden')
            categoryElements.removeClass('tah-hidden')
            titleButtons.removeClass('disable-edit')
            subtitles.removeClass('disable-edit')
            game.user.setFlag('token-action-hud-core', 'isUnlocked', true)
        }

        /**
         * Lock the hud
         * @param {object} event
         */
        function lockHud (event) {
            event.preventDefault()
            event = event || window.event
            $(event.target).addClass('tah-hidden')
            html.find(unlockButton).removeClass('tah-hidden')
            html.find(editCategoriesButton).addClass('tah-hidden')
            for (const categoryElement of categoryElements) {
                const hasActions = (categoryElement.getElementsByClassName('tah-action').length > 0)
                if (!hasActions) $(categoryElement).addClass('tah-hidden')
            }
            titleButtons.addClass('disable-edit')
            subtitles.addClass('disable-edit')
            game.user.setFlag('token-action-hud-core', 'isUnlocked', false)
        }

        $(document)
            .find('.tah-filterholder')
            .parents('.tah-subcategory')
            .css('cursor', 'pointer')
    }

    dragEvent (event) {
        event.preventDefault()
        if (!getSetting('drag')) return
        const element = event.target.parentElement.closest('div#token-action-hud')
        document.onmousemove = mouseMoveEvent
        document.onmouseup = mouseUpEvent
        element.ontouchmove = mouseMoveEvent
        element.ontouchend = mouseUpEvent

        const clientX = event.clientX ?? event.changedTouches[0].clientX
        const clientY = event.clientY ?? event.changedTouches[0].clientY
        let pos1 = 0
        let pos2 = 0
        let pos3 = clientX
        let pos4 = clientY
        let elementTop = element.offsetTop
        let elementLeft = element.offsetLeft

        function mouseMoveEvent (event) {
            event = event || window.event
            const clientX = event.clientX ?? event.changedTouches[0].clientX
            const clientY = event.clientY ?? event.changedTouches[0].clientY
            pos1 = pos3 - clientX
            pos2 = pos4 - clientY
            pos3 = clientX
            pos4 = clientY
            elementTop = element.offsetTop - pos2
            elementLeft = element.offsetLeft - pos1

            // Set the hud to the new position
            element.style.top = elementTop + 'px'
            element.style.left = elementLeft + 'px'
            element.style.position = 'fixed'
        }

        function mouseUpEvent () {
            document.onmousemove = null
            document.onmouseup = null
            element.ontouchmove = null
            element.ontouchend = null

            game.user.update({
                flags: {
                    'token-action-hud-core': { position: { top: elementTop, left: elementLeft } }
                }
            })

            Logger.debug(`Set position to x: ${elementTop}px, y: ${elementLeft}px`)
        }
    }

    /**
     * Apply Settings
     */
    applySettings () {
        if (getSetting('direction') === 'up') {
            $(document).find('.tah-subcategories').removeClass('expand-down')
            $(document).find('.tah-subcategories').addClass('expand-up')
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
        if (!game.user.flags['token-action-hud-core'].position) return

        const pos = game.user.flags['token-action-hud-core'].position
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
    resetPosition () {
        game.user.update({
            flags: { 'token-action-hud-core': { position: { top: this.defaultTopPos, left: this.defaultLeftPos } } }
        })
        this.update()

        Logger.debug(`Reset position to x: ${this.defaultTopPos}px, y: ${this.defaultLeftPos}px`)
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

        if (getSetting('clickOpenCategory')) {
            const button = category.find('.tah-title-button')[0]
            button.click()
        } else {
            category.mouseenter()
        }
    }

    /**
     * Reset the hud
     */
    async reset () {
        await this._resetFlags()
        this.resetPosition()
    }

    /**
     * Reset user flags
     */
    async _resetFlags () {
        Logger.debug('Resetting user flags')
        await this.categoryManager.reset()
        this.update()
        Logger.debug('User flags reset')
    }

    /**
     * Update the hud with a delay
     */
    update () {
        // Delay refresh because switching tokens could cause a controlToken(false) then controlToken(true) very fast
        if (this.refreshTimeout) clearTimeout(this.refreshTimeout)
        this.refreshTimeout = setTimeout(this._updateHud.bind(this), 100)
    }

    /**
     * Update the hud
     */
    async _updateHud () {
        Logger.debug('Updating hud...')
        const controlledTokens = this.tokens?.controlled
        const character = this._getCharacter(controlledTokens)

        const multipleTokens = controlledTokens.length > 1 && !character

        if ((!character && !multipleTokens) || !this.isHudEnabled()) {
            this.close()
            return
        }

        this.actionList = await this.actionHandler.buildActionList(character)

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
        if (getSetting('alwaysShowHud')) {
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
        const controlledTokens = this.tokens?.controlled
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
            Logger.debug('Flags set, do not update hud')
            return false
        }

        if (actor) {
            if (!actor) {
                Logger.debug('No actor, update hud')
                return true
            }

            if (this.actionList && actor.id === this.actionList.actorId) {
                Logger.debug('Same actor, update hud')
                return true
            }

            Logger.debug('Different actor, do not update hud')
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
        const allowRole = getSetting('allow')
        const isAllowed = checkAllow(userRole)
        const isEnabled = getSetting('enable')

        Logger.debug(
            'isHudEnabled()',
            `isGM: ${isGM}`,
            `allow: ${allowRole}`,
            `checkAllow: ${isAllowed}`,
            `enable: ${isEnabled}`
        )

        if (!isEnabled) return false

        return isAllowed || isGM
    }

    /**
     * Whether the hooked compendium is linked
     * @param {string} compendiumKey
     * @returns {boolean}
     */
    isLinkedCompendium (compendiumKey) {
        Logger.debug('Compendium hook triggered, checking if compendium is linked')
        return this.categoryManager.isLinkedCompendium(compendiumKey)
    }

    /**
     * Get character from selected tokens
     * @private
     */
    _getCharacter (controlled = []) {
        if (controlled.length > 1) return null
        let character
        if (controlled.length === 1) {
            const token = controlled[0]
            const actor = token.actor
            if (!this._isValidCharacter(token)) return null
            character = { token, actor }
            character.id = token?.id ?? actor?.id
            character.name = token?.name ?? actor?.name
            if (character.id) return character
        }
        if (controlled.length === 0 && game.user.character) {
            if (!getSetting('alwaysShowHud')) return null

            const actor = game.user.character
            const token = canvas?.tokens?.placeables.find(
                (token) => token.actor?.id === actor?.id
            )
            character = { token: token ?? null, actor }
            character.id = token?.id ?? actor.id
            character.name = token?.name ?? actor.name
            if (character.id) return character
        }
        return null
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
