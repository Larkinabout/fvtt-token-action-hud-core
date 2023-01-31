import { TagDialog } from './tag-dialog.js'
import { Utils } from '../utilities/utils.js'

/**
 * Generates data for the dialogs.
 */
export class TagDialogHelper {
    /**
     * Show the category dialog
     * @param {CategoryManager} categoryManager The CategoryManager class
     * @public
     */
    static async showCategoryDialog (categoryManager) {
        // Set available and selected tags
        const tags = {}
        tags.available = []
        tags.selected = await categoryManager.getSelectedCategoriesAsTagifyEntries()

        // Set dialog data
        const dialogData = {
            title: Utils.i18n('tokenActionHud.tagDialog.categoryDialogTitle'),
            content: {
                topLabel: Utils.i18n('tokenActionHud.tagDialog.categoryDialogDescription'),
                placeholder: Utils.i18n('tokenActionHud.tagDialog.tagPlaceholder'),
                clearButtonText: Utils.i18n('tokenActionHud.tagDialog.clearButton'),
                indexExplanationLabel: Utils.i18n('tokenActionHud.pushLabelExplanation')
            }
        }

        // Set function on submit
        const dialogSubmit = async (choices, formData) => {
            await categoryManager.saveCategories(choices)
            Hooks.callAll('forceUpdateTokenActionHud')
        }

        // Show dialog
        TagDialog.showDialog(null, tags, dialogData, dialogSubmit)
    }

    /**
     * Show subcategory dialog
     * @public
     * @param {object} categorySubcategoryData The category/subcategory data
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
            title: Utils.i18n('tokenActionHud.tagDialog.subcategoryDialogTitle') + ` (${name})`,
            content: {
                topLabel: Utils.i18n('tokenActionHud.tagDialog.subcategoryDialogDescription'),
                placeholder: Utils.i18n('tokenActionHud.tagDialog.tagPlaceholder'),
                clearButtonText: Utils.i18n('tokenActionHud.tagDialog.clearButton'),
                advancedCategoryOptions: await categoryManager.getAdvancedCategoryOptions(categorySubcategoryData),
                level: 'category'
            }
        }

        // Set function on submit
        const dialogSubmit = async (choices, formData) => {
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

            const characterCount = formData?.characterCount
            const customWidth = formData?.customWidth
            const image = formData?.image
            const showTitle = formData?.showTitle
            categorySubcategoryData.advancedCategoryOptions = { characterCount, customWidth, image, showTitle }

            // Save selected subcategories to user action list
            await categoryManager.saveSubcategories(choices, categorySubcategoryData)

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
     * @param {object} subcategoryData The subcategory data
     */
    static async showActionDialog (categoryManager, actionHandler, parentSubcategoryData) {
        const { nestId, name } = parentSubcategoryData

        // Set available and selected tags
        const tags = {}

        // Get available actions and subcategories
        const availableActions = await actionHandler.getAvailableActionsAsTagifyEntries(parentSubcategoryData)
        const availableSubcategories = await categoryManager.getAvailableSubcategoriesAsTagifyEntries(parentSubcategoryData)
        tags.available = [...availableActions, ...availableSubcategories]

        // Get selected actions and subcategories
        const selectedActions = await actionHandler.getSelectedActionsAsTagifyEntries(parentSubcategoryData)
        const selectedSubcategories = await categoryManager.getSelectedSubcategoriesAsTagifyEntries(parentSubcategoryData)
        tags.selected = [...selectedActions, ...selectedSubcategories]

        // Set dialog data
        const dialogData = {
            title: `${Utils.i18n('tokenActionHud.tagDialog.actionDialogTitle')} (${name})`,
            content: {
                topLabel: Utils.i18n('tokenActionHud.tagDialog.actionDialogDescription'),
                placeholder: Utils.i18n('tokenActionHud.tagDialog.tagPlaceholder'),
                clearButtonText: Utils.i18n('tokenActionHud.tagDialog.clearButton'),
                indexExplanationLabel: Utils.i18n('tokenActionHud.blockListLabel'),
                advancedCategoryOptions: await categoryManager.getAdvancedCategoryOptions(parentSubcategoryData),
                level: 'subcategory'
            }
        }

        // Set function on submit
        const dialogSubmit = async (choices, formData) => {
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
            const characterCount = formData?.characterCount
            const image = formData?.image
            const showTitle = formData?.showTitle
            parentSubcategoryData.advancedCategoryOptions = { characterCount, image, showTitle }

            // Save subcategories to user action list
            await categoryManager.saveSubcategories(selectedSubcategories, parentSubcategoryData)

            // Save actions to actor action list
            await actionHandler.saveActions(selectedActions, parentSubcategoryData)

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
