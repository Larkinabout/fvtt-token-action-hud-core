import { TagDialog } from './tag-dialog.js'
import { Utils } from '../utilities/utils.js'

/**
 * Generates data for the dialogs.
 */
export class TagDialogHelper {
    /**
     * Show the HUD dialog
     * @param {ActionHandler} actionHandler The ActionHandler class
     * @public
     */
    static async showHudDialog (actionHandler) {
        // Set available and selected tags
        const tags = {}
        tags.available = []
        tags.selected = await actionHandler.getSelectedGroups()
        const grid = await Utils.getSetting('grid')

        // Set dialog data
        const dialogData = {
            title: Utils.i18n('tokenActionHud.tagDialog.hudDialogTitle'),
            content: {
                topLabel: Utils.i18n('tokenActionHud.tagDialog.hudDialogDescription'),
                placeholder: Utils.i18n('tokenActionHud.tagDialog.tagPlaceholder'),
                clearButtonText: Utils.i18n('tokenActionHud.tagDialog.clearButton'),
                indexExplanationLabel: Utils.i18n('tokenActionHud.pushLabelExplanation'),
                settings: { grid },
                level: 'hud'
            }
        }

        // Set function on submit
        const dialogSubmit = async (choices, formData) => {
            const grid = formData?.grid
            await actionHandler.updateGroups(choices, { level: 0 })
            await actionHandler.saveGroups()
            await Utils.setSetting('grid', grid)
            Hooks.callAll('forceUpdateTokenActionHud')
        }

        // Show dialog
        TagDialog.showDialog(null, tags, dialogData, dialogSubmit)
    }

    /**
     * Show group dialog
     * @public
     * @param {class} actionHandler The ActionHandler class
     * @param {object} groupData    The group data
     */
    static async showGroupDialog (actionHandler, groupData) {
        const { nestId, name, level } = groupData

        // Set available and selected tags
        const tags = {}

        // Get available subcategories
        tags.available = await actionHandler.getAvailableGroups({ nestId, level })

        // Get selected subcategories
        tags.selected = await actionHandler.getSelectedGroups({ nestId, level })

        // Set dialog data
        const dialogData = {
            title: Utils.i18n('tokenActionHud.tagDialog.groupDialogTitle') + ` (${name})`,
            content: {
                topLabel: Utils.i18n('tokenActionHud.tagDialog.groupDialogDescription'),
                placeholder: Utils.i18n('tokenActionHud.tagDialog.tagPlaceholder'),
                clearButtonText: Utils.i18n('tokenActionHud.tagDialog.clearButton'),
                settings: await actionHandler.getGroupSettings(groupData),
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
                return {
                    id: choice.id,
                    name: choice.name,
                    type: choice.type
                }
            })

            const characterCount = formData?.characterCount
            const customWidth = formData?.customWidth
            const grid = formData?.grid
            const image = formData?.image
            const showTitle = formData?.showTitle
            const sort = formData?.sort
            groupData.settings = { characterCount, customWidth, grid, image, showTitle, sort }

            // Save selected subcategories to user action list
            await actionHandler.updateGroups(choices, groupData)
            await actionHandler.saveGroups()
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
     * @param {class} actionHandler The ActionHandler class
     * @param {object} groupData    The group data
     */
    static async showActionDialog (actionHandler, groupData) {
        const { nestId, name, level } = groupData

        // Set available and selected tags
        const tags = {}

        // Get available actions and subcategories
        const availableActions = await actionHandler.getAvailableActions(groupData)
        const availableSubcategories = await actionHandler.getAvailableGroups({ nestId, level })
        tags.available = [...availableActions, ...availableSubcategories]

        // Get selected actions and subcategories
        const selectedActions = await actionHandler.getSelectedActions(groupData)
        const selectedGroups = await actionHandler.getSelectedGroups({ nestId, level })
        tags.selected = [...selectedActions, ...selectedGroups]

        // Set dialog data
        const dialogData = {
            title: `${Utils.i18n('tokenActionHud.tagDialog.actionDialogTitle')} (${name})`,
            content: {
                topLabel: Utils.i18n('tokenActionHud.tagDialog.actionDialogDescription'),
                placeholder: Utils.i18n('tokenActionHud.tagDialog.tagPlaceholder'),
                clearButtonText: Utils.i18n('tokenActionHud.tagDialog.clearButton'),
                indexExplanationLabel: Utils.i18n('tokenActionHud.blockListLabel'),
                settings: await actionHandler.getGroupSettings(groupData),
                level: 'subcategory'
            }
        }

        // Set function on submit
        const dialogSubmit = async (choices, formData) => {
            const selectedGroups = []
            const selectedActions = []
            for (const choice of choices) {
                if (choice.type === 'action') {
                    selectedActions.push(choice)
                } else {
                    selectedGroups.push(choice)
                }
            }

            // Get advanced category options
            const characterCount = formData?.characterCount
            const grid = formData?.grid
            const image = formData?.image
            const showTitle = formData?.showTitle
            const sort = formData?.sort
            groupData.settings = { characterCount, grid, image, showTitle, sort }

            // Save subcategories to user action list
            await actionHandler.updateGroups(selectedGroups, groupData)
            await actionHandler.updateActions(selectedActions, groupData)
            await actionHandler.saveGroups()

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
