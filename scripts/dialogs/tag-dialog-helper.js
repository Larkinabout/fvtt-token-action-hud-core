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
            await TagDialogHelper.saveCategories(categoryManager, choices)
        }

        TagDialog.showDialog(null, null, selected, title, hbsData, submitFunc)
    }

    static showSubcategoryDialog (categoryManager, categorySubcategoryData) {
        TagDialogHelper._showSubcategoryDialog(
            categoryManager,
            categorySubcategoryData
        )
    }

    static async _showSubcategoryDialog (categoryManager, subcategoryData) {
        const nestId = subcategoryData.nestId
        const categorySubcategoryName = subcategoryData.name
        const suggestions = await categoryManager.getSubcategoriesAsTagifyEntries()
        const selected = await categoryManager.getSelectedSubcategoriesAsTagifyEntries(subcategoryData)

        const title = game.i18n.localize('tokenActionHud.subcategoryTagTitle') + ` (${categorySubcategoryName})`

        const hbsData = {
            topLabel: game.i18n.localize('tokenActionHud.subcategoryTagExplanation'),
            placeholder: game.i18n.localize('tokenActionHud.filterPlaceholder'),
            clearButtonText: game.i18n.localize('tokenActionHud.clearButton'),
            advancedCategoryOptions: game.user.getFlag(
                'token-action-hud-core',
                `categories.${nestId}.advancedCategoryOptions`
            )
        }

        const submitFunc = async (choices, html) => {
            choices = choices.map((choice) => {
                choice.id =
                choice.id ??
                choice.name.slugify({
                    replacement: '-',
                    strict: true
                })
                choice.type = choice.type ?? 'custom'
                return { id: choice.id, name: choice.name, type: choice.type }
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

            await TagDialogHelper.saveSubcategories(
                categoryManager,
                choices,
                advancedCategoryOptions,
                subcategoryData
            )
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

    static async showActionDialog (categoryManager, actionHandler, subcategoryData) {
        await TagDialogHelper._showActionDialog(categoryManager, actionHandler, subcategoryData)
    }

    static async _showActionDialog (categoryManager, actionHandler, subcategoryData) {
        const nestId = subcategoryData?.nestId
        const subcategoryName = subcategoryData?.name
        // Get suggestions
        const suggestedActions = await actionHandler.getActionsAsTagifyEntries(subcategoryData)
        const suggestedSubcategories = await categoryManager.getSubcategoriesAsTagifyEntries()
        const suggestions = []
        suggestions.push(...suggestedActions, ...suggestedSubcategories)

        // Get selected
        const selectedActions = await actionHandler.getSelectedActionsAsTagifyEntries(subcategoryData)
        const selectedSubcategories = await categoryManager.getSelectedSubcategoriesAsTagifyEntries(subcategoryData)
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
            await TagDialogHelper.saveActions(categoryManager, actionHandler, choices, subcategoryData)
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
    static async saveCategories (categoryManager, choices) {
        await categoryManager.saveCategories(choices)
        Hooks.callAll('forceUpdateTokenActionHud')
    }

    static async saveSubcategories (categoryManager, choices, advancedCategoryOptions, subcategoryData) {
        await categoryManager.saveSubcategories(choices, advancedCategoryOptions, subcategoryData)
        Hooks.callAll('forceUpdateTokenActionHud')
    }

    static async saveActions (categoryManager, actionHandler, choices, subcategoryData) {
        const nestId = subcategoryData.nestId
        const selectedSubcategories = choices.filter(choice => choice.level === 'subcategory')
        await categoryManager.saveSubcategories(selectedSubcategories, '', subcategoryData)

        const selectedActions = choices.filter(choice => choice.level === 'action')
        await actionHandler.saveActions(selectedActions, subcategoryData)

        Hooks.callAll('forceUpdateTokenActionHud')
    }
}
