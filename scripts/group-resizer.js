import { Utils } from './utils.js'

export class GroupResizer {
    direction = null
    minCols = 3
    isCustomWidth = false
    settings = null
    spacing = 10

    /**
     * Resize the groups element
     * @param {ActionHandler} actionHandler The actionHandler class
     * @param {object} groupElement         The group element
     * @param {string} autoDirection        The direction the HUD will expand
     * @param {boolean} gridModuleSetting   The grid module setting
     */
    async resizeGroup (actionHandler, groupElement, autoDirection, gridModuleSetting) {
        // Exit early if no group element exists
        if (!groupElement) return

        this.#resetVariables()

        this.groupElement = groupElement

        // Get groups element
        await this.#getGroupsElement()

        // Exit early if no groups element exists
        if (!this.groupsElement) return

        this.actionsElements = this.groupElement.querySelectorAll('.tah-actions')

        // Exit early if no action elements exist
        if (this.actionsElements.length === 0) return

        // Reset groups elements
        this.#resetGroupsElements()

        // Set direction
        this.direction = autoDirection

        // Get group settings
        const nestId = this.groupElement.dataset.nestId
        this.settings = await actionHandler.getGroupSettings({ nestId, level: 1 })

        // Get available width
        this.availableWidth = this.#getAvailableWidth()

        // Get groups
        this.#getGroupElements()

        // Loop groups
        let hasGrid = false
        for (const groupElement of this.groupElements) {
            const actionsElement = groupElement.querySelector('.tah-actions')
            if (!actionsElement) continue
            const nestId = groupElement.dataset.nestId
            const groupSettings = await actionHandler.getGroupSettings({ nestId })
            const groupCustomWidth = groupSettings.customWidth
            const grid = gridModuleSetting || this.settings?.grid || groupSettings?.grid
            if (grid) {
                if (!hasGrid) {
                    await this.#getGridWidth()
                    hasGrid = true
                }
                await this.#resizeGrid(actionsElement, groupCustomWidth)
            } else {
                await this.#resize(actionsElement, groupCustomWidth)
            }
        }

        // Set group height
        await this.#setHeight()
    }

    /**
     * Reset variables
     * @private
     */
    #resetVariables () {
        this.actionsElements = null
        this.availableHeight = null
        this.availableWidth = null
        this.direction = null
        this.gridWidth = null
        this.groupElement = null
        this.groupElements = null
        this.groupsElement = null
        this.groupsElementPadding = null
        this.groupsElementRect = null
        this.isCustomWidth = false
        this.minCols = 3
        this.settings = null
        this.spacing = 10
    }

    /**
     * Reset groups elements
     */
    #resetGroupsElements () {
        const level1GroupElement = this.groupElement.closest('.tah-tab-group[data-level="1"]')
        const groupsElements = level1GroupElement.querySelectorAll('.tah-groups')
        const style = { maxHeight: '', overflowY: '' }
        this.#resetCSS(groupsElements, style)
    }

    /**
     * Get the grid width
     * @private
     */
    async #getGridWidth () {
        // Reset action elements
        const emptyStyle = { display: '', gridTemplateColumns: '', width: '' }
        await this.#resetCSS(this.actionsElements, emptyStyle)

        const actionWidths = []
        const actionWidthsForMedian = []
        for (const actionsElement of this.actionsElements) {
            const actionElements = actionsElement.querySelectorAll('.tah-action:not(.shrink)')
            for (const actionElement of actionElements) {
                const actionRect = actionElement.getBoundingClientRect()
                const actionWidth = Math.round(parseFloat(actionRect.width) + 1 || 0)
                const actionButtonText = actionElement.querySelector('.tah-action-button-text')
                const actionButtonTextRect = actionButtonText?.getBoundingClientRect()
                const actionButtonTextWidth = Math.round(parseFloat(actionButtonTextRect?.width) || 0)
                actionWidthsForMedian.push(actionWidth)
                actionWidths.push({ actionWidth, actionButtonTextWidth })
            }
        }

        let upperQuartileAverage = Math.ceil(Utils.getUpperQuartileAverage(actionWidthsForMedian))
        const minActionButtonTextWidth = 30

        for (const actionWidth of actionWidths) {
            const availableactionButtonTextWidth = upperQuartileAverage - (actionWidth.actionWidth - actionWidth.actionButtonTextWidth)
            if (availableactionButtonTextWidth < minActionButtonTextWidth) {
                upperQuartileAverage = (upperQuartileAverage - availableactionButtonTextWidth) + minActionButtonTextWidth
            }
        }

        this.gridWidth = upperQuartileAverage
    }

    /**
     * Resize the actions element into the grid format
     * @private
     * @param {object} actionsElement The actions element
     * @param {number} customWidth    The custom width
     */
    async #resizeGrid (actionsElement, groupCustomWidth) {
        if (!actionsElement) return
        const emptyStyle = { display: '', gridTemplateColumns: '', width: '' }
        await this.#assignCSS(actionsElement, emptyStyle)

        const actions = actionsElement.querySelectorAll('.tah-action')
        const squaredCols = Math.ceil(Math.sqrt(actions.length))
        const availableGroupWidth = groupCustomWidth ?? this.availableWidth
        const availableCols = Math.floor(availableGroupWidth / this.gridWidth)
        const cols = (squaredCols > availableCols || groupCustomWidth) ? availableCols : (actions.length <= this.minCols) ? actions.length : squaredCols
        // Apply maxHeight and width styles to content
        const style = { display: 'grid', gridTemplateColumns: `repeat(${cols}, ${this.gridWidth}px)` }
        await this.#assignCSS(actionsElement, style)
    }

    /**
     * Resize the actions element
     * @private
     * @param {object} actionsElement The actions element
     * @param {number} customWidth    The custom width
     */
    async #resize (actionsElement, groupCustomWidth) {
        if (!actionsElement) return

        let width = 500

        if (this.isCustomWidth) {
            width = this.availableWidth
        } else if (groupCustomWidth) {
            width = groupCustomWidth
        } else {
            const actions = actionsElement.querySelectorAll('.tah-action')
            if (!actions.length) return
            const sqrtActions = Math.ceil(Math.sqrt(actions.length)) // 4

            // Initialize variables
            let currentRow = 1
            let maxRowWidth = 0
            let rowWidth = 0
            // Iterate through action groups, calculating dimensions and counts
            if (actions.length > 0) {
                actions.forEach((action, index) => {
                    if ((index + 1) / sqrtActions > currentRow) {
                        rowWidth = rowWidth - 5
                        maxRowWidth = (rowWidth > maxRowWidth) ? rowWidth : maxRowWidth
                        rowWidth = 0
                        currentRow++
                    }
                    const actionRect = action.getBoundingClientRect()
                    // const actionLeft = (index === 0) ? actionRect.left - this.groupsElementRect.left : 0
                    const actionWidth = Math.ceil(parseFloat(actionRect.width) + 1 || 0)
                    rowWidth += actionWidth
                    // + actionLeft + 5
                    if (index + 1 === actions.length) {
                        rowWidth = rowWidth - 5
                        maxRowWidth = (rowWidth > maxRowWidth) ? rowWidth : maxRowWidth
                    }
                })
            }

            // Add padding to maxAvgGroupWidth and maxGroupWidth
            maxRowWidth += this.groupsElementPadding

            // Determine width of content
            width = (maxRowWidth < this.availableWidth && actions.length > 3) ? maxRowWidth : this.availableWidth
            if (width < 200) width = 200
        }

        const style = { maxWidth: `${width}px` }
        await this.#assignCSS(actionsElement, style)
    }

    /**
     * Get available content width
     * @private
     */
    #getAvailableWidth () {
        const customWidth = this.settings?.customWidth

        if (customWidth) {
            this.isCustomWidth = true
            return customWidth
        }

        const windowWidth = canvas.screenDimensions[0] || window.innerWidth
        const contentLeft = this.groupsElementRect.left
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
    #getAvailableHeight () {
        const windowHeight = canvas.screenDimensions[1] || window.innerHeight
        const contentBottom = this.groupsElementRect.bottom
        const contentTop = this.groupsElementRect.top
        const uiTopBottom = (this.direction === 'down')
            ? document.querySelector('#ui-bottom')
            : document.querySelector('#ui-top')
        const uiTopBottomOffsetHeight = uiTopBottom.offsetHeight
        const availableHeight = (this.direction === 'down')
            ? windowHeight - contentTop - uiTopBottomOffsetHeight - this.spacing
            : contentBottom - uiTopBottomOffsetHeight - this.spacing
        return Math.floor(availableHeight < 100 ? 100 : availableHeight)
    }

    /**
     * Get content
     * @private
     */
    async #getGroupsElement () {
        this.groupsElement = this.groupElement.querySelector('.tah-groups')
        if (!this.groupsElement) return
        this.groupsElementRect = this.groupsElement.getBoundingClientRect()
        this.groupsElementComputed = getComputedStyle(this.groupsElement)
        this.groupsElementPadding =
            Math.ceil(parseFloat(this.groupsElementComputed.paddingLeft) || 0) +
            Math.ceil(parseFloat(this.groupsElementComputed.paddingRight) || 0)
    }

    /**
     * Get groups
     * @private
     */
    #getGroupElements () {
        this.groupElements = this.groupElement.querySelectorAll('.tah-group')
        if (this.groupElements.length === 0) this.groupElements = [this.groupElement]
    }

    /**
     * Set the content height
     * @private
     */
    async #setHeight () {
        requestAnimationFrame(() => {
            this.availableHeight = this.#getAvailableHeight()
            const style = { maxHeight: `${this.availableHeight}px`, overflowY: 'auto' }
            Object.assign(this.groupsElement.style, style)
        })
    }

    /**
     * Assign CSS
     * @private
     * @param {object} element The DOM element
     * @param {object} style   The style
     */
    async #assignCSS (element, style) {
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
    async #resetCSS (elements, style) {
        for (const element of elements) {
            Object.assign(element.style, style)
        }
    }
}
