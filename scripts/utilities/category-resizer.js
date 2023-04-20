import { Utils } from './utils.js'

export class CategoryResizer {
    actionsElements = null
    availableHeight = null
    availableWidth = null
    category = null
    content = null
    contentPadding = null
    contentRect = null
    direction = null
    gridWidth = null
    gap = 5
    groups = null
    level1GroupElement = null
    level1GroupElementRect = null
    minCols = 3
    isCustomWidth = false
    settings = null
    spacing = 10
    topGroup = null

    /**
     * Resize the category
     * @param {ActionHandler} actionHandler The actionHandler class
     * @param {object} category                 The category
     * @param {string} autoDirection            The direction the HUD will expand
     * @param {boolean} gridModuleSetting       The grid module setting
     */
    async resizeCategory (actionHandler, groupElement, autoDirection, gridModuleSetting) {
        // Exit early if no group element exists
        if (!groupElement) return

        this._resetVariables()

        this.groupElement = groupElement
        this.actionsElements = this.groupElement.querySelectorAll('.tah-actions')

        // Exit early if no action elements exist
        if (this.actionsElements.length === 0) return

        this.level1GroupElement = this.groupElement.closest('.tah-tab-group[data-level="1"]')
        this.level1GroupElementRect = this.level1GroupElement.getBoundingClientRect()

        // Get group element indent
        this._getGroupElementIndent()

        // Set direction
        this.direction = autoDirection

        // Set gap
        this.gap = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tah-gap') ?? 5)

        // Get advanced category options
        const nestId = this.groupElement.dataset.nestId
        this.settings = await actionHandler.getGroupSettings({ nestId, level: 1 })

        // Get content
        await this._getContent()

        // Unset content height and weight
        await this.unsetHeightAndWidth()

        // Get available width
        this.availableWidth = this._getAvailableWidth()

        // Get groups
        this._getGroups()

        // Loop groups
        let hasGrid = false
        let maxWidth = 0
        for (const groupElement of this.groupElements) {
            const actionsElement = groupElement.querySelector('.tah-actions')
            if (!actionsElement) continue
            const nestId = groupElement.dataset.nestId
            const groupSettings = await actionHandler.getGroupSettings({ nestId })
            const grid = gridModuleSetting || this.settings?.grid || groupSettings?.grid
            if (grid) {
                if (!hasGrid) {
                    await this._getGridWidth()
                    hasGrid = true
                }
                const width = await this._resizeGrid(actionsElement)
                if (width > maxWidth) maxWidth = width
            } else {
                const width = await this._resize(actionsElement)
                if (width > maxWidth) maxWidth = width
            }
        }

        // Set content height and width
        await this._setWidth(maxWidth)
        await this._setHeight()
    }

    /**
     * Reset variables
     * @private
     */
    _resetVariables () {
        this.actionsElements = null
        this.gap = 5
        this.groupElements = null
        this.settings = null
        this.availableHeight = null
        this.availableWidth = null
        this.groupElement = null
        this.content = null
        this.contentPadding = null
        this.contentRect = null
        this.direction = null
        this.gridWidth = null
        this.level1GroupElement = null
        this.level1GroupElementRect = null
        this.minCols = 3
        this.isCustomWidth = false
        this.spacing = 10
    }

    /**
     * Get the grid width
     * @private
     */
    async _getGridWidth () {
        // Reset action elements
        const emptyStyle = { display: '', gridTemplateColumns: '', width: '' }
        await this._resetCSS(this.actionsElements, emptyStyle)

        const actionWidths = []
        const actionWidthsForMedian = []
        for (const actionsElement of this.actionsElements) {
            const actionElements = actionsElement.querySelectorAll('.tah-action:not(.shrink)')
            for (const actionElement of actionElements) {
                const actionRect = actionElement.getBoundingClientRect()
                const actionWidth = Math.round(parseFloat(actionRect.width) + 1 || 0)
                const actionButtonText = actionElement.querySelector('.tah-action-button-text')
                const actionButtonTextRect = actionButtonText.getBoundingClientRect()
                const actionButtonTextWidth = Math.round(parseFloat(actionButtonTextRect.width) || 0)
                actionWidthsForMedian.push(actionWidth)
                actionWidths.push({ actionWidth, actionButtonTextWidth })
            }
        }

        let medianWidth = Math.ceil(Utils.median(actionWidthsForMedian) * 1.1)
        const minActionButtonTextWidth = 30

        for (const actionWidth of actionWidths) {
            const availableactionButtonTextWidth = medianWidth - (actionWidth.actionWidth - actionWidth.actionButtonTextWidth)
            if (availableactionButtonTextWidth < minActionButtonTextWidth) {
                medianWidth = (medianWidth - availableactionButtonTextWidth) + minActionButtonTextWidth
            }
        }

        this.gridWidth = medianWidth
    }

    /**
     * Resize the actions element into the grid format
     * @private
     * @param {object} actionsElement The actions element
     */
    async _resizeGrid (actionsElement) {
        if (!actionsElement) return
        const emptyStyle = { display: '', gridTemplateColumns: '', width: '' }
        await this._assignCSS(actionsElement, emptyStyle)

        const actions = actionsElement.querySelectorAll('.tah-action')
        const squaredCols = Math.ceil(Math.sqrt(actions.length))
        const availableCols = Math.floor(this.availableWidth / this.gridWidth)
        const cols = (squaredCols > availableCols) ? availableCols : (actions.length <= this.minCols) ? actions.length : squaredCols
        // Apply maxHeight and width styles to content
        const style = { display: 'grid', gridTemplateColumns: `repeat(${cols}, ${this.gridWidth}px)` }
        await this._assignCSS(actionsElement, style)

        const gaps = (cols - 1) * this.gap
        const actionsElementIndent = this._getActionsElementIndent(actionsElement)
        return (cols * this.gridWidth) + gaps + this.groupElementIndent + actionsElementIndent
    }

    /**
     * Resize the actions element
     * @private
     * @param {object} actionsElement The actions element
     */
    async _resize (actionsElement) {
        if (!actionsElement) return

        let width = 500
        if (this.isCustomWidth) {
            width = this.availableWidth
        } else {
            // Initialize variables
            let maxActions = 0
            let maxGroupWidth = 0
            // Iterate through action groups, calculating dimensions and counts
            const actions = actionsElement.querySelectorAll('.tah-action')
            if (actions.length > 0) {
                let groupWidth = 0
                actions.forEach((action, index) => {
                    const actionRect = action.getBoundingClientRect()
                    const actionLeft = (index === 0) ? actionRect.left - this.contentRect.left : 0
                    const actionWidth = Math.ceil(parseFloat(actionRect.width) + 1 || 0)
                    groupWidth += actionWidth + actionLeft
                })
                if (groupWidth > maxGroupWidth) {
                    maxGroupWidth = groupWidth
                    maxActions = actions.length
                }
            }

            // Add padding to maxAvgGroupWidth and maxGroupWidth
            maxGroupWidth += (maxActions * 5) - 5
            maxGroupWidth += this.contentPadding
            const medianWidthPerAction = maxGroupWidth / maxActions

            // Determine number of columns
            const defaultCols = 5
            let cols = (maxActions < defaultCols) ? maxActions : defaultCols
            const availableCols = Math.floor(this.availableWidth / medianWidthPerAction)
            const sqrtActionsPerGroup = Math.ceil(Math.sqrt(maxActions))
            if (sqrtActionsPerGroup > cols && sqrtActionsPerGroup <= availableCols) cols = sqrtActionsPerGroup

            // Determine width of content
            width = medianWidthPerAction * cols
            if (width > this.availableWidth) width = this.availableWidth
            if (width < 200) width = 200
        }

        const style = { width: `${width}px` }
        await this._assignCSS(actionsElement, style)

        const actionsElementIndent = this._getActionsElementIndent(actionsElement)
        return width + this.groupElementIndent + actionsElementIndent
    }

    /**
     * Get actions element indent
     * @private
     */
    _getActionsElementIndent (actionsElement) {
        const actionsElementRect = actionsElement.getBoundingClientRect()
        return actionsElementRect.left - this.firstGroupElementRect.left
    }

    /**
     * Get group element indent
     * @private
     */
    _getGroupElementIndent () {
        const groupElementRect = this.groupElement.getBoundingClientRect()
        this.groupElementIndent = groupElementRect.left - this.level1GroupElementRect.left
    }

    /**
     * Get available content width
     * @private
     */
    _getAvailableWidth () {
        const customWidth = this.settings?.customWidth

        if (customWidth) {
            this.isCustomWidth = true
            return customWidth
        }

        const windowWidth = canvas.screenDimensions[0]
        const contentLeft = this.contentRect.left
        const uiRight = document.querySelector('#ui-right')
        const uiRightClientWidth = uiRight.clientWidth
        return Math.floor((
            uiRightClientWidth > 0
                ? windowWidth - uiRightClientWidth
                : windowWidth
        ) - this.spacing - contentLeft)
    }

    /**
     * Get available content height
     * @private
     */
    _getAvailableHeight () {
        const windowHeight = canvas.screenDimensions[1]
        const contentHeight = this.contentRect.height
        const contentTop = this.contentRect.top
        const uiTopBottom = (this.direction === 'down')
            ? document.querySelector('#ui-bottom')
            : document.querySelector('#ui-top')
        const uiTopBottomOffsetHeight = uiTopBottom.offsetHeight
        const availableHeight = (this.direction === 'down')
            ? windowHeight - contentTop - uiTopBottomOffsetHeight - this.spacing
            : (contentHeight + contentTop) - uiTopBottomOffsetHeight - this.spacing
        return Math.floor(availableHeight < 100 ? 100 : availableHeight)
    }

    /**
     * Get content
     * @private
     */
    async _getContent () {
        this.content = this.level1GroupElement.querySelector('.tah-groups')
        this.contentRect = this.content.getBoundingClientRect()
        this.contentComputed = getComputedStyle(this.content)
        this.contentPadding =
            Math.ceil(parseFloat(this.contentComputed.paddingLeft) || 0) +
            Math.ceil(parseFloat(this.contentComputed.paddingRight) || 0)
    }

    /**
     * Get groups
     * @private
     */
    _getGroups () {
        this.groupElements = this.groupElement.querySelectorAll('.tah-group')
        this.firstGroupElement = this.groupElements[0]
        this.firstGroupElementRect = this.firstGroupElement.getBoundingClientRect()
        this.lastGroupElement = this.groupElements[this.groupElements.length - 1]
    }

    /**
     * Unset the content height and width
     */
    async unsetHeightAndWidth () {
        const emptyStyle = { height: '', maxHeight: '', width: 'max-content' }
        await this._resetCSS([this.content], emptyStyle)
    }

    /**
     * Set the content height
     * @private
     */
    async _setHeight () {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.availableHeight = this._getAvailableHeight()
                const level1GroupElementRect = this.level1GroupElement.getBoundingClientRect()
                const lastGroupElementRect = this.lastGroupElement.getBoundingClientRect()
                if (lastGroupElementRect.bottom === 0) return
                const groupHeight = (lastGroupElementRect.bottom - level1GroupElementRect.top) + 10
                const height = (this.availableHeight < groupHeight) ? this.availableHeight : groupHeight
                const style = { height: `${height}px` }
                Object.assign(this.content.style, style)
            })
        })
    }

    /**
     * Set the content width
     * @private
     */
    async _setWidth (width) {
        if (!width) return
        width = width + 20
        const style = { width: `${width}px` }
        await this._assignCSS(this.content, style)
    }

    /**
     * Assign CSS
     * @private
     * @param {object} element The DOM element
     * @param {object} style   The style
     */
    async _assignCSS (element, style) {
        if (!element) return
        requestAnimationFrame(() => {
            Object.assign(element.style, style)
        })
    }

    /**
     * Reset CSS
     * @private
     * @param {array} elements The DOM elements
     * @param {object} style   The style
     */
    async _resetCSS (elements, style) {
        for (const element of elements) {
            Object.assign(element.style, style)
        }
    }
}
