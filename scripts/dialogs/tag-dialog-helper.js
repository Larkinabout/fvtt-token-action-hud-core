import { TagDialog } from './tag-dialog.js'

export class TagDialogHelper {
    /** SHOW CATEGORY/SUBCATEGORY/ACTION DIALOGS */
    static showCategoryDialog (categoryManager) {
        TagDialogHelper._showCategoryDialog(categoryManager)
    }

    static _showCategoryDialog (categoryManager) {
        const selected = categoryManager.getSelectedCategoriesAsTagifyEntries()
        const title = game.i18n.localize('tokenActionHud.categoryTagTitle')

        const hbsData = {
            topLabel: game.i18n.localize('tokenActionHud.categoryTagExplanation'),
            placeholder: game.i18n.localize('tokenActionHud.filterPlaceholder'),
            clearButtonText: game.i18n.localize('tokenActionHud.clearButton'),
            indexExplanationLabel: game.i18n.localize(
                'tokenActionHud.pushLabelExplanation'
            )
        }

        const submitFunc = async (choices) => {
            await TagDialogHelper.submitCategories(categoryManager, choices)
        }

        TagDialog.showDialog(null, null, selected, title, hbsData, submitFunc)
    }

    static showSubcategoryDialog (categoryManager, categoryId, categoryName) {
        TagDialogHelper._showSubcategoryDialog(
            categoryManager,
            categoryId,
            categoryName
        )
    }

    static async _showSubcategoryDialog (categoryManager, categoryId, categoryName) {
        const suggestions = await categoryManager.getSubcategoriesAsTagifyEntries()
        const selected = await categoryManager.getSelectedSubcategoriesAsTagifyEntries(categoryId)

        const title = game.i18n.localize('tokenActionHud.subcategoryTagTitle') + ` (${categoryName})`

        const hbsData = {
            topLabel: game.i18n.localize('tokenActionHud.subcategoryTagExplanation'),
            placeholder: game.i18n.localize('tokenActionHud.filterPlaceholder'),
            clearButtonText: game.i18n.localize('tokenActionHud.clearButton'),
            advancedCategoryOptions: game.user.getFlag(
                'token-action-hud-core',
                `categories.${categoryId}.advancedCategoryOptions`
            )
        }

        const submitFunc = async (choices, html) => {
            choices = choices.map((choice) => {
                choice.id =
          choice.id ??
          choice.title.slugify({
              replacement: '-',
              strict: true
          })
                choice.type = choice.type ?? 'custom'
                return { id: choice.id, title: choice.title, type: choice.type }
            })

            const customWidth = parseInt(
                html.find('input[name="custom-width"]').val()
            )
            const compactView = html
                .find('input[name="compact-view"]')
                .prop('checked')
            const characterCount = parseInt(
                html.find('input[name="character-count"]').val()
            )
            const advancedCategoryOptions = {
                customWidth,
                compactView,
                characterCount
            }

            await TagDialogHelper.submitSubcategories(
                categoryManager,
                categoryId,
                choices,
                advancedCategoryOptions
            )
        }

        TagDialog.showDialog(
            categoryId,
            suggestions,
            selected,
            title,
            hbsData,
            submitFunc
        )
    }

    static async showActionDialog (categoryManager, actionHandler, nestId, subcategoryName) {
        await TagDialogHelper._showActionDialog(categoryManager, actionHandler, nestId, subcategoryName)
    }

    static async _showActionDialog (categoryManager, actionHandler, nestId, subcategoryName) {
        // Get suggestions
        const suggestedActions = await actionHandler.getActionsAsTagifyEntries(nestId)
        const suggestedSubcategories = await categoryManager.getSubcategoriesAsTagifyEntries()
        const suggestions = []
        suggestions.push(...suggestedActions, ...suggestedSubcategories)

        // Get selected
        const selectedActions = await actionHandler.getSelectedActionsAsTagifyEntries(nestId)
        const selectedSubcategories = await categoryManager.getSelectedSubcategoriesAsTagifyEntries(nestId)
        const selected = []
        selected.push(...selectedActions, ...selectedSubcategories)

        const title = `${game.i18n.localize('tokenActionHud.filterTitle')} (${subcategoryName})`

        const hbsData = {
            topLabel: game.i18n.localize('tokenActionHud.filterTagExplanation'),
            placeholder: game.i18n.localize('tokenActionHud.filterPlaceholder'),
            clearButtonText: game.i18n.localize('tokenActionHud.clearButton'),
            indexExplanationLabel: game.i18n.localize(
                'tokenActionHud.blockListLabel'
            )
        }

        const submitFunc = async (choices) => {
            await TagDialogHelper.saveActions(categoryManager, actionHandler, nestId, choices)
        }

        TagDialog.showDialog(
            nestId,
            suggestions,
            selected,
            title,
            hbsData,
            submitFunc
        )
    }

    // SUBMIT CATEGORIES/SUBCATEGORIES/ACTIONS
    static async submitCategories (categoryManager, choices) {
        await categoryManager.submitCategories(choices)
        Hooks.callAll('forceUpdateTokenActionHud')
    }

    static async submitSubcategories (categoryManager, categoryId, choices) {
        await categoryManager.submitSubcategories(categoryId, choices)
        Hooks.callAll('forceUpdateTokenActionHud')
    }

    static async saveActions (categoryManager, actionHandler, nestId, choices) {
        const selectedSubcategories = choices.filter(choice => choice.level === 'subcategory')
        await categoryManager.submitSubcategories(nestId, selectedSubcategories)

        const selectedActions = choices.filter(choice => choice.level === 'action')
        await actionHandler.saveActions(nestId, selectedActions)

        Hooks.callAll('forceUpdateTokenActionHud')
    }
}
