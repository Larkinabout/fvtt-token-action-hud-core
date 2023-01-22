export class CategoryResizer {
    /**
     * Resize the category
     * @param {CategoryManager} categoryManager The CategoryManager class
     * @param {obeject} category The category
     * @param {string} direction The HUD expand direction
     */
    static async resizeCategory (categoryManager, category, direction) {
        // Exit early if no category element passed in or no action groups within it
        if (!category) return
        const actionGroups = category.querySelectorAll('.tah-actions')
        if (actionGroups.length === 0) return

        // Get content element
        const content = category.querySelector('.tah-subcategories')

        // Check if category has custom width set
        const categoryId = category.id.replace('tah-category-', '')
        const advancedCategoryOptions = await categoryManager.getAdvancedCategoryOptions(categoryId)
        const customWidth = advancedCategoryOptions?.customWidth

        // Spacing from other elements in the window
        const spacing = 10

        // Get content
        const contentRect = content.getBoundingClientRect()
        const contentHeight = contentRect.height
        const contentTop = contentRect.top

        // Calculate maxHeight
        const windowHeight = canvas.screenDimensions[1]
        const uiTopBottom = (direction === 'down') ? document.querySelector('#ui-bottom') : document.querySelector('#ui-top')
        const uiTopBottomOffsetHeight = uiTopBottom.offsetHeight
        const availableHeight = (direction === 'down')
            ? windowHeight - contentTop - uiTopBottomOffsetHeight - spacing
            : (contentHeight + contentTop) - uiTopBottomOffsetHeight - spacing
        const maxHeight = availableHeight < 100 ? 100 : availableHeight

        // Calculate width
        let width = 500
        if (customWidth) {
            width = customWidth
        } else {
            const uiRight = document.querySelector('#ui-right')
            const windowWidth = canvas.screenDimensions[0]
            // Get available width for content
            const contentComputed = getComputedStyle(content)
            const contentPadding =
            Math.ceil(parseFloat(contentComputed.paddingLeft) || 0) +
            Math.ceil(parseFloat(contentComputed.paddingRight) || 0)
            const contentLeft = contentRect.left
            const uiRightClientWidth = uiRight.clientWidth
            const availableWidth = (
                uiRightClientWidth > 0
                    ? windowWidth - uiRightClientWidth
                    : windowWidth
            ) - spacing - contentLeft

            // Initialize variables
            let minActions = null
            let maxActions = null
            let maxGroupWidth = 0
            let maxAverageGroupWidth = 0

            // Iterate through action groups, calculating dimensions and counts
            for (const actionGroup of actionGroups) {
                const actions = actionGroup.querySelectorAll('.tah-action')
                if (actions.length > 0) {
                    if (actions.length < minActions || minActions === null) minActions = actions.length
                    if (actions.length > maxActions || maxActions === null) maxActions = actions.length
                    let groupWidth = 0
                    actions.forEach(action => {
                        const actionComputed = getComputedStyle(action)
                        const actionWidth = Math.ceil(parseFloat(actionComputed.width) + 1 || 0)
                        groupWidth += actionWidth
                    })
                    const totalGaps = (actions.length * 5) - 5
                    groupWidth += totalGaps
                    if (groupWidth > maxGroupWidth) maxGroupWidth = groupWidth
                    const averageGroupWidth = groupWidth / actions.length
                    if (averageGroupWidth > maxAverageGroupWidth) maxAverageGroupWidth = averageGroupWidth
                }
            }
            // Add padding to  maxAverageGroupWidth and maxGroupWidth
            maxAverageGroupWidth += contentPadding
            maxGroupWidth += contentPadding

            // Determine number of columns
            const defaultCols = 5
            const oneAndHalfDefaultCols = defaultCols / 2 + defaultCols
            let cols = defaultCols
            const maxCols = Math.floor(availableWidth / maxAverageGroupWidth)
            if (minActions < maxCols && minActions > Math.floor(oneAndHalfDefaultCols)) cols = minActions
            if (maxActions < maxCols && maxActions < Math.ceil(oneAndHalfDefaultCols)) cols = maxActions
            if (maxCols < cols) cols = maxCols

            // Determine width of content
            width = maxAverageGroupWidth * cols
            if (width > maxGroupWidth) width = maxGroupWidth
            if (width < 200) width = 200
        }

        // Apply maxHeight and width styles to content
        requestAnimationFrame(() => {
            Object.assign(content.style, { maxHeight: `${Math.ceil(maxHeight)}px`, width: `${width}px` })
        })
    }
}
