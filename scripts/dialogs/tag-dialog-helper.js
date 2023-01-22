import { TagDialog } from './tag-dialog.js'

export class TagDialogHelper {
    /**
     * Show the category dialog
     * @public
     */
    static async showCategoryDialog (categoryManager) {
        // Set available and selected tags
        const tags = {}
        tags.available = []
        tags.selected = await categoryManager.getSelectedCategoriesAsTagifyEntries()

        // Set dialog data
        const dialogData = {
            title: game.i18n.localize('tokenActionHud.tagDialog.categoryDialogTitle'),
            content: {
                topLabel: game.i18n.localize('tokenActionHud.tagDialog.categoryDialogDescription'),
                placeholder: game.i18n.localize('tokenActionHud.tagDialog.tagPlaceholder'),
                clearButtonText: game.i18n.localize('tokenActionHud.tagDialog.clearButton'),
                indexExplanationLabel: game.i18n.localize('tokenActionHud.pushLabelExplanation')
            }
        }

        // Set function on submit
        const dialogSubmit = async (choices) => {
            await categoryManager.saveCategories(choices)
            Hooks.callAll('forceUpdateTokenActionHud')
        }

        // Show dialog
        TagDialog.showDialog(null, tags, dialogData, dialogSubmit)
    }

    /**
     * Show subcategory dialog
     * @public
     * @param {object} categorySubcategoryData
     */
    static async showSubcategoryDialog (categoryManager, categorySubcategoryData) {
        const { nestId, name } = categorySubcategoryData

        // Set available and selected tags
        const tags = {}

        // Get available subcategories
        tags.available = await categoryManager.getAvailableSubcategoriesAsTagifyEntries(categorySubcategoryData)

        // Get selected subcategories
        tags.selected = await categoryManager.getSelectedSubcategoriesAsTagifyEntries(categorySubcategoryData)

        // Set dialog data
        const dialogData = {
            title: game.i18n.localize('tokenActionHud.tagDialog.subcategoryDialogTitle') + ` (${name})`,
            content: {
                topLabel: game.i18n.localize('tokenActionHud.tagDialog.subcategoryDialogDescription'),
                placeholder: game.i18n.localize('tokenActionHud.tagDialog.tagPlaceholder'),
                clearButtonText: game.i18n.localize('tokenActionHud.tagDialog.clearButton'),
                advancedCategoryOptions: await categoryManager.getAdvancedCategoryOptions(nestId),
                level: 'category'
            }
        }

        // Set function on submit
        const dialogSubmit = async (choices, html) => {
            choices = choices.map((choice) => {
                choice.id =
                choice.id ??
                choice.name.slugify({
                    replacement: '-',
                    strict: true
                })
                choice.type = choice.type ?? 'custom'
                choice.hasDerivedSubcategories = choice.hasDerivedSubcategories ?? 'false'
                return {
                    id: choice.id,
                    name: choice.name,
                    type: choice.type,
                    hasDerivedSubcategories: choice.hasDerivedSubcategories
                }
            })

            // Get advanced category options
            const customWidth = parseInt(html.find('input[name="custom-width"]').val())
            const characterCount = parseInt(html.find('input[name="character-count"]').val())
            const advancedCategoryOptions = { customWidth, characterCount }

            // Save selected subcategories to user action list
            await categoryManager.saveSubcategories(choices, advancedCategoryOptions, categorySubcategoryData)

            Hooks.callAll('forceUpdateTokenActionHud')
        }

        TagDialog.showDialog(
            nestId,
            tags,
            dialogData,
            dialogSubmit
        )
    }

    /**
     * Show action dialog
     * @public
     * @param {*} subcategoryData
     */
    static async showActionDialog (categoryManager, actionHandler, subcategoryData) {
        const { nestId, name } = subcategoryData

        // Set available and selected tags
        const tags = {}

        // Get available actions and subcategories
        const availableActions = await actionHandler.getActionsAsTagifyEntries(subcategoryData)
        const availableSubcategories = await categoryManager.getAvailableSubcategoriesAsTagifyEntries(subcategoryData)
        tags.available = [...availableActions, ...availableSubcategories]

        // Get selected actions and subcategories
        const selectedActions = await actionHandler.getSelectedActionsAsTagifyEntries(subcategoryData)
        const selectedSubcategories = await categoryManager.getSelectedSubcategoriesAsTagifyEntries(subcategoryData)
        tags.selected = [...selectedActions, ...selectedSubcategories]

        // Set dialog data
        const dialogData = {
            title: `${game.i18n.localize('tokenActionHud.tagDialog.actionDialogTitle')} (${name})`,
            content: {
                topLabel: game.i18n.localize('tokenActionHud.tagDialog.actionDialogDescription'),
                placeholder: game.i18n.localize('tokenActionHud.tagDialog.tagPlaceholder'),
                clearButtonText: game.i18n.localize('tokenActionHud.tagDialog.clearButton'),
                indexExplanationLabel: game.i18n.localize('tokenActionHud.blockListLabel'),
                advancedCategoryOptions: await categoryManager.getAdvancedCategoryOptions(nestId),
                level: 'subcategory'
            }
        }

        // Set function on submit
        const dialogSubmit = async (choices, html) => {
            const selectedSubcategories = []
            const selectedActions = []
            for (const choice of choices) {
                switch (choice.level) {
                case 'subcategory':
                    selectedSubcategories.push(choice)
                    break
                case 'action':
                    selectedActions.push(choice)
                    break
                }
            }

            // Get advanced category options
            const customWidth = parseInt(html.find('input[name="custom-width"]').val())
            const characterCount = parseInt(html.find('input[name="character-count"]').val())
            const advancedCategoryOptions = { customWidth, characterCount }

            // Save subcategories to user action list
            await categoryManager.saveSubcategories(selectedSubcategories, advancedCategoryOptions, subcategoryData)

            // Save actions to actor action list
            await actionHandler.saveActions(selectedActions, subcategoryData)

            Hooks.callAll('forceUpdateTokenActionHud')
        }

        TagDialog.showDialog(
            nestId,
            tags,
            dialogData,
            dialogSubmit
        )
    }
}
