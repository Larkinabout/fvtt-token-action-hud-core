export class CategoryResizer {
    static resizeHoveredCategory (category) {
        // Exit early if no category element passed in or no action groups within it
        if (!category) return
        const actionGroups = category.querySelectorAll('.tah-actions')
        if (actionGroups.length === 0) return

        // Get content element
        const content = category.querySelector('.tah-subcategories')

        // Check if category has custom width set
        const categoryId = category.id.replace('tah-category-', '')
        const customWidth = game.user.getFlag(
            'token-action-hud-core',
            `categories.${categoryId}.advancedCategoryOptions.customWidth`
        )
        if (customWidth) return (content.style.width = `${customWidth}px`)

        // Get sidebar, hotbar, window width and height
        const sidebar = document.querySelector('#sidebar')
        const hotbar = document.querySelector('#hotbar')
        const windowWidth = canvas.screenDimensions[0]
        const windowHeight = canvas.screenDimensions[1]

        // Get available width for content
        const contentComputed = window.getComputedStyle(content)
        const contentPadding =
            parseInt(contentComputed.paddingLeft) || 0 +
            parseInt(contentComputed.paddingRight) || 0
        const contentRect = content.getBoundingClientRect()
        const contentTop = contentRect.top
        const contentLeft = contentRect.left
        const sidebarOffsetLeft = sidebar.offsetLeft
        const sidebarClientWidth = sidebar.clientWidth
        const availableWidth = (
            sidebarOffsetLeft > 0
                ? windowWidth - (sidebarOffsetLeft + sidebarClientWidth)
                : windowWidth
        ) - 20 - contentLeft

        // Get the limit for the bottom of the content
        const hotbarOffsetTop = hotbar.offsetTop
        const bottomLimit = (hotbarOffsetTop > 0 ? hotbarOffsetTop : windowHeight) - 20

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
                    const actionRect = action.getBoundingClientRect()
                    const actionWidth = Math.ceil(actionRect.width)
                    groupWidth += actionWidth
                    totalWidth += actionWidth
                })
                const totalGaps = actions.length * 5
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
        const maxHeight = windowHeight - contentTop - (windowHeight - bottomLimit)
        const newHeight = maxHeight < 100 ? 100 : maxHeight

        // Set styles for content
        const styles = {
            width: `${width}px`,
            maxHeight: `${Math.ceil(newHeight)}px`
        }

        Object.assign(content.style, styles)
    }
}
