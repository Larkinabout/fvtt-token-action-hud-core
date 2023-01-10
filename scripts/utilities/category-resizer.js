export class CategoryResizer {
    static resizeHoveredCategory (category) {
        if (!category) return

        // Get action groups
        const actionGroups = category.querySelectorAll('.tah-actions')
        if (actionGroups.length === 0) return

        // Get content
        const content = category.querySelector('.tah-subcategories')

        // Set custom width
        const categoryId = category.id.replace('tah-category-', '')
        const customWidth = game.user.getFlag(
            'token-action-hud-core',
            `categories.${categoryId}.advancedCategoryOptions.customWidth`
        )
        if (customWidth) {
            content.style.width = `${customWidth}px`
            return
        }

        const sidebar = document.querySelector('#sidebar')
        const hotbar = document.querySelector('#hotbar')

        const windowWidth = canvas.screenDimensions[0]
        const windowHeight = canvas.screenDimensions[1]
        const contentRect = content.getBoundingClientRect()
        const contentComputed = getComputedStyle(content)
        const contentTop = contentRect.top
        const contentLeft = contentRect.left
        const contentPadding =
            parseInt(contentComputed.paddingLeft) || 0 +
            parseInt(contentComputed.paddingRight) || 0
        const sidebarOffsetLeft = sidebar.offsetLeft
        const sidebarClientWidth = sidebar.clientWidth
        const sidebarLeft = (sidebarOffsetLeft > 0) ? windowWidth - (sidebarOffsetLeft + sidebarClientWidth) : windowWidth
        const rightLimit = sidebarLeft - 20
        const availableWidth = rightLimit - contentLeft
        const hotbarOffsetTop = hotbar.offsetTop
        const hotbarTop = (hotbarOffsetTop > 0) ? hotbarOffsetTop : windowHeight
        const bottomLimit = hotbarTop - 20

        // Set width
        let minActions = null
        let maxGroupWidth = 0
        let totalWidth = 0
        let totalLength = 0
        for (const actionGroup of actionGroups) {
            const actions = actionGroup.querySelectorAll('.tah-action')
            if (actions.length > 0) {
                if (actions.length < minActions || minActions === null) minActions = actions.length
                totalLength += actions.length
                let groupWidth = 0
                for (const action of Array.from(actions)) {
                    const actionRect = action.getBoundingClientRect()
                    const actionWidth = Math.ceil(actionRect.width)
                    groupWidth += actionWidth
                    totalWidth += actionWidth
                }
                const totalGaps = actions.length * 5
                totalWidth += totalGaps
                groupWidth += totalGaps
                if (groupWidth > maxGroupWidth) maxGroupWidth = groupWidth
            }
        }
        maxGroupWidth += contentPadding
        totalWidth += contentPadding
        const averageWidth = Math.ceil(totalWidth / totalLength)

        let cols = 5
        const maxCols = Math.floor(availableWidth / averageWidth)
        if (minActions < maxCols && minActions > cols && minActions < 10) cols = minActions
        if (maxCols < cols) cols = maxCols
        let width = averageWidth * cols
        if (width > maxGroupWidth) width = maxGroupWidth
        if (width < 200) width = 200

        // Set max-height
        const maxHeight = windowHeight - contentTop - (windowHeight - bottomLimit)
        const newHeight = maxHeight < 100 ? 100 : maxHeight

        // Set styles
        content.style.width = `${width}px`
        content.style.maxHeight = Math.ceil(newHeight) + 'px'
    }
}
