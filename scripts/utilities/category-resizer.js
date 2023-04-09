import { Utils } from './utils.js'

export class CategoryResizer {
    actionGroups = null
    actionGroupsGap = 5
    advancedCategoryOptions = null
    availableHeight = null
    availableWidth = null
    category = null
    content = null
    contentPadding = null
    contentRect = null
    direction = null
    gridWidth = null
    minCols = 3
    isCustomWidth = false
    spacing = 10
    subcategories = null

    /**
     * Resize the category
     * @param {CategoryManager} categoryManager The CategoryManager class
     * @param {object} category                 The category
     * @param {string} autoDirection            The direction the HUD will expand
     * @param {boolean} gridModuleSetting       The grid module setting
     */
    async resizeCategory (categoryManager, category, autoDirection, gridModuleSetting) {
        // Exit early if no category element passed in
        if (!category) return

        this._resetVariables()

        this.category = category

        this.actionGroups = category.querySelectorAll('.tah-actions')

        // Exit early if no action groups exist
        if (this.actionGroups.length === 0) return

        this.actionGroupsGap = parseInt(getComputedStyle(this.actionGroups[0]).gap ?? 5)

        // Set direction
        this.direction = autoDirection

        // Get advanced category options
        const categoryId = this.category.id.replace('tah-category-', '')
        this.advancedCategoryOptions = await categoryManager.getAdvancedCategoryOptions(categoryId)

        // Get content
        await this.getContent()

        // Set height
        this.setHeight()

        // Get available width
        this.availableWidth = await this.getAvailableWidth()

        // Get subcategories
        await this.getSubcategories()

        let hasGrid = false

        // Loop subcategories
        for (const subcategory of this.subcategories) {
            const actionGroup = subcategory.querySelector('.tah-actions')
            const subcategoryAdvancedCategoryOptions = await categoryManager.getAdvancedCategoryOptions(subcategory.id)
            const grid = gridModuleSetting || this.advancedCategoryOptions?.grid || subcategoryAdvancedCategoryOptions?.grid
            if (grid) {
                if (!hasGrid) {
                    this.getGridWidth()
                    hasGrid = true
                }
                this.resizeGrid(actionGroup)
            } else {
                this.resize(actionGroup)
            }
        }
    }

    _resetVariables () {
        this.actionGroups = null
        this.actionGroupsGap = 5
        this.advancedCategoryOptions = null
        this.availableHeight = null
        this.availableWidth = null
        this.category = null
        this.content = null
        this.contentPadding = null
        this.contentRect = null
        this.direction = null
        this.gridWidth = null
        this.minCols = 3
        this.isCustomWidth = false
        this.spacing = 10
        this.subcategories = null
    }

    /**
     * Set the content height
     */
    async setHeight () {
        // Get available height
        this.availableHeight = await this.getAvailableHeight()

        const style = { maxHeight: `${this.availableHeight}px` }
        await this.assignCSS(this.content, style)
    }

    /**
     * Get the grid width
     */
    async getGridWidth () {
        // Reset action groups
        const emptyStyle = { display: '', gridTemplateColumns: '', width: '' }
        await this.resetCSS(this.actionGroups, emptyStyle)

        const actionWidths = []
        const actionWidthsForMedian = []
        for (const actionGroup of this.actionGroups) {
            const actions = actionGroup.querySelectorAll('.tah-action:not(.shrink)')
            for (const action of actions) {
                const actionRect = action.getBoundingClientRect()
                const actionWidth = Math.round(parseFloat(actionRect.width) + 1 || 0)
                const actionButtonText = action.querySelector('.tah-action-button-text')
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
     * Resize the action group into the grid format
     * @param {object} actionGroup The action group
     */
    async resizeGrid (actionGroup) {
        if (!actionGroup) return
        const emptyStyle = { display: '', gridTemplateColumns: '', width: '' }
        await this.assignCSS(actionGroup, emptyStyle)

        const actions = actionGroup.querySelectorAll('.tah-action')
        const squaredCols = Math.ceil(Math.sqrt(actions.length))
        const availableCols = Math.floor(this.availableWidth / this.gridWidth)
        const cols = (squaredCols > availableCols) ? availableCols : (actions.length <= this.minCols) ? actions.length : squaredCols

        // Apply maxHeight and width styles to content
        const style = { display: 'grid', gridTemplateColumns: `repeat(${cols}, ${this.gridWidth}px)` }
        await this.assignCSS(actionGroup, style)
    }

    /**
     * Resize the action group
     * @param {object} actionGroup The action group
     */
    async resize (actionGroup) {
        if (!actionGroup) return
        // Calculate width
        let width = 500
        if (this.isCustomWidth) {
            width = this.availableWidth
        } else {
            // Initialize variables
            let maxActions = 0
            let maxGroupWidth = 0
            // Iterate through action groups, calculating dimensions and counts
            const actions = actionGroup.querySelectorAll('.tah-action')
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
            // Add padding to  maxAvgGroupWidth and maxGroupWidth

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
        await this.assignCSS(actionGroup, style)
    }

    /**
     * Get available content width
     */
    async getAvailableWidth () {
        const customWidth = this.advancedCategoryOptions?.customWidth

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
     */
    async getAvailableHeight () {
        // Calculate maxHeight
        const windowHeight = canvas.screenDimensions[1]
        const contentHeight = this.contentRect.height
        const contentTop = this.contentRect.top
        const uiTopBottom = (this.direction === 'down') ? document.querySelector('#ui-bottom') : document.querySelector('#ui-top')
        const uiTopBottomOffsetHeight = uiTopBottom.offsetHeight
        const availableHeight = (this.direction === 'down')
            ? windowHeight - contentTop - uiTopBottomOffsetHeight - this.spacing
            : (contentHeight + contentTop) - uiTopBottomOffsetHeight - this.spacing
        return Math.floor(availableHeight < 100 ? 100 : availableHeight)
    }

    /**
     * Get content
     */
    async getContent () {
        this.content = this.category.querySelector('.tah-subcategories')
        this.contentRect = this.content.getBoundingClientRect()
        this.contentComputed = getComputedStyle(this.content)
        this.contentPadding =
            Math.ceil(parseFloat(this.contentComputed.paddingLeft) || 0) +
            Math.ceil(parseFloat(this.contentComputed.paddingRight) || 0)
    }

    /**
     * Get subcategories
     */
    async getSubcategories () {
        this.subcategories = this.category.querySelectorAll('.tah-subcategory')
    }

    async assignCSS (element, style) {
        if (!element) return
        requestAnimationFrame(() => {
            Object.assign(element.style, style)
        })
    }

    async resetCSS (elements, style) {
        for (const element of elements) {
            Object.assign(element.style, style)
        }
    }
}
