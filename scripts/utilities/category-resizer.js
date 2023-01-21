export class CategoryResizer {
    static resizeHoveredCategory (category, direction) {
        // Exit early if no category element passed in or no action groups within it
        if (!category) return
        const actionGroups = category.querySelectorAll('.tah-actions')
        if (actionGroups.length === 0) return

        // Get content element
        const content = category.querySelector('.tah-subcategories')

        // Check if category has custom width set
        /*  const categoryId = category.id.replace('tah-category-', '')
        const customWidth = game.user.getFlag(
            'token-action-hud-core',
            `categories.${categoryId}.advancedCategoryOptions.customWidth`
        )
        if (customWidth) return (content.style.width = `${customWidth}px`) */

        const spacing = 10

        // Get ui-right, ui-top or ui-bottom, window width and height
        const uiRight = document.querySelector('#ui-right')
        const uiTopBottom = (direction === 'down') ? document.querySelector('#ui-bottom') : document.querySelector('#ui-top')
        const windowWidth = canvas.screenDimensions[0]
        const windowHeight = canvas.screenDimensions[1]

        // Get available width for content
        const contentComputed = getComputedStyle(content)
        const contentPadding =
            parseInt(contentComputed.paddingLeft) || 0 +
            parseInt(contentComputed.paddingRight) || 0
        const contentRect = content.getBoundingClientRect()
        const contentHeight = contentRect.height
        const contentLeft = contentRect.left
        const contentTop = contentRect.top
        const uiRightClientWidth = uiRight.clientWidth
        const availableWidth = (
            uiRightClientWidth > 0
                ? windowWidth - uiRightClientWidth
                : windowWidth
        ) - spacing - contentLeft

        // Get the limit for the bottom of the content
        const uiTopBottomOffsetHeight = uiTopBottom.offsetHeight
        const availableHeight = (direction === 'down')
            ? windowHeight - contentTop - uiTopBottomOffsetHeight - spacing
            : (contentHeight + contentTop) - uiTopBottomOffsetHeight - spacing

        // Initialize variables
        let minActions = null
        let maxGroupWidth = 0
        let totalWidth = 0
        let totalLength = 0

        // Iterate through action groups, calculating dimensions and counts
        for (const actionGroup of actionGroups) {
            const actions = actionGroup.querySelectorAll('.tah-action')
            if (actions.length > 0) {
                if (actions.length < minActions || minActions === null) minActions = actions.length
                totalLength += actions.length
                let groupWidth = 0
                actions.forEach(action => {
                    const actionComputed = getComputedStyle(action)
                    const actionWidth = Math.ceil(parseInt(actionComputed.width) || 0)
                    groupWidth += actionWidth
                    totalWidth += actionWidth
                })
                const totalGaps = (actions.length * 5) - 5
                totalWidth += totalGaps
                groupWidth += totalGaps
                if (groupWidth > maxGroupWidth) maxGroupWidth = groupWidth
            }
        }
        // Add padding to maxGroupWidth and totalWidth
        maxGroupWidth += contentPadding
        totalWidth += contentPadding

        // Calculate average width
        const averageWidth = Math.ceil(totalWidth / totalLength)

        // Determine number of columns
        let cols = 5
        const maxCols = Math.floor(availableWidth / averageWidth)
        if (minActions < maxCols && minActions > cols && minActions < 10) cols = minActions
        if (maxCols < cols) cols = maxCols

        // Determine width of content
        let width = averageWidth * cols
        if (width > maxGroupWidth) width = maxGroupWidth
        if (width < 200) width = 200

        // Set max height of content
        const maxHeight = availableHeight < 100 ? 100 : availableHeight

        // Apply styles
        requestAnimationFrame(() => {
            Object.assign(content.style, { maxHeight: `${Math.ceil(maxHeight)}px`, width: `${width}px` })
        })
    }
}
