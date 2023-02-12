import { Utils } from './utils.js'

export class CategoryResizer {
    category = null
    actionGroups = null
    content = null
    contentPadding = null
    contentRect = null
    direction = null
    spacing = 10
    availableHeight = null
    availableWidth = null
    isCustomWidth = false
    advancedCategoryOptions = null

    /**
     * Resize the category
     * @param {CategoryManager} categoryManager The CategoryManager class
     * @param {object} category                 The category
     * @param {string} autoDirection            The direction the HUD will expand
     */
    async resizeCategory (categoryManager, category, autoDirection, grid) {
        // Exit early if no category element passed in
        if (!category) return

        this.category = category

        this.actionGroups = category.querySelectorAll('.tah-actions')

        // Exit early if no action groups exist
        if (this.actionGroups.length === 0) return

        // Set direction
        this.direction = autoDirection

        // Get advanced category options
        const categoryId = this.category.id.replace('tah-category-', '')
        this.advancedCategoryOptions = await categoryManager.getAdvancedCategoryOptions(categoryId)

        // Get content
        await this.getContent()

        // Get available height
        this.availableHeight = await this.getAvailableHeight()

        // Get available width
        this.availableWidth = await this.getAvailableWidth()

        //  Get grid
        grid = grid || this.advancedCategoryOptions?.grid
        if (grid) {
            this.resizeGrid()
        } else {
            this.resizeContent()
        }
    }

    async resizeGrid () {
        const actionGroupGap = parseInt(getComputedStyle(this.actionGroups[0]).gap ?? 5)
        const emptyStyle = { display: '', gridTemplateColumns: '', width: '' }
        await this.resetCSS(this.actionGroups, emptyStyle)

        const actionWidths = []
        for (const actionGroup of this.actionGroups) {
            const actions = actionGroup.querySelectorAll('.tah-action:not(.shrink)')
            for (const action of actions) {
                const actionRect = action.getBoundingClientRect()
                const actionWidth = Math.round(parseFloat(actionRect.width) + 1 || 0)
                actionWidths.push(actionWidth)
            }
        }

        const medianWidth = Math.ceil(Utils.median(actionWidths) * 1.1)

        let maxWidth = 0
        for (const actionGroup of this.actionGroups) {
            const actions = actionGroup.querySelectorAll('.tah-action')
            const squaredCols = Math.ceil(Math.sqrt(actions.length))
            const availableCols = Math.floor(this.availableWidth / medianWidth)
            const cols = (squaredCols > availableCols) ? availableCols : squaredCols
            const width = (cols * medianWidth) + ((cols - 1) * actionGroupGap) + this.contentPadding
            maxWidth = (width > maxWidth) ? width : maxWidth

            // Apply maxHeight and width styles to content
            const style = { display: 'grid', gridTemplateColumns: `repeat(${cols}, ${medianWidth}px)`, width: `${width}px` }
            await this.assignCSS(actionGroup, style)
        }

        const style = { maxHeight: `${this.availableHeight}px`, width: `${maxWidth + 40}px` }
        await this.assignCSS(this.content, style)
    }

    async resizeContent () {
        // Calculate width
        let width = 500
        if (this.isCustomWidth) {
            width = this.availableWidth
        } else {
            // Initialize variables
            let maxActions = 0
            let maxGroupWidth = 0
            // Iterate through action groups, calculating dimensions and counts
            for (const actionGroup of this.actionGroups) {
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
            }
            // Add padding to  maxAvgGroupWidth and maxGroupWidth

            maxGroupWidth += (maxActions * 5) - 5
            maxGroupWidth += this.contentPadding
            const medianWidthPerAction = maxGroupWidth / maxActions

            // Determine number of columns
            const defaultCols = 5
            let cols = (maxActions < defaultCols) ? maxActions : defaultCols
            const maxCols = Math.floor(this.availableWidth / medianWidthPerAction)
            const sqrtActionsPerGroup = Math.ceil(Math.sqrt(maxActions))
            if (sqrtActionsPerGroup > cols && sqrtActionsPerGroup <= maxCols) cols = sqrtActionsPerGroup

            // Determine width of content
            width = medianWidthPerAction * cols
            if (width > this.availableWidth) width = this.availableWidth
            if (width < 200) width = 200
        }

        // Apply maxHeight and width styles to content
        const style = { maxHeight: `${this.availableHeight}px`, width: `${width}px` }
        await this.assignCSS(this.content, style)
    }

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

    async getContent () {
        this.content = this.category.querySelector('.tah-subcategories')
        this.contentRect = this.content.getBoundingClientRect()
        this.contentComputed = getComputedStyle(this.content)
        this.contentPadding =
            Math.ceil(parseFloat(this.contentComputed.paddingLeft) || 0) +
            Math.ceil(parseFloat(this.contentComputed.paddingRight) || 0)
    }

    async assignCSS (element, style) {
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
