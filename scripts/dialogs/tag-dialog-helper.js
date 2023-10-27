import { TEMPLATE } from '../constants.js'
import { TagDialog } from './tag-dialog.js'
import { Utils } from '../utils.js'

/**
 * Generates data for the dialogs.
 */
export class TagDialogHelper {
    /**
     * Show the HUD dialog
     * @public
     * @param {object} actionHandler The ActionHandler class
     */
    static async showHudDialog (actionHandler) {
        // Set available and selected tags
        const tags = {}
        tags.available = []
        tags.selected = await actionHandler.getSelectedGroups()
        const grid = await Utils.getSetting('grid')

        // Set dialog data
        const dialogData = {
            title: Utils.i18n('tokenActionHud.form.hud.hudTitle'),
            content: {
                topLabel: Utils.i18n('tokenActionHud.form.hud.hudDetail'),
                placeholder: Utils.i18n('tokenActionHud.form.hud.tagPlaceholder'),
                settings: { grid }
            }
        }

        // Set function on submit
        const dialogSubmit = async (choices, formData) => {
            const grid = formData?.grid
            await actionHandler.updateGroups(choices, { level: 0 })
            await actionHandler.saveGroups({ saveActor: true, saveUser: true })
            await Utils.setSetting('grid', grid)
            Hooks.callAll('forceUpdateTokenActionHud')
        }

        // Show dialog
        TagDialog.showDialog('hud', null, tags, dialogData, dialogSubmit)
    }

    /**
     * Show group dialog
     * @public
     * @param {object} actionHandler The ActionHandler class
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
            title: Utils.i18n('tokenActionHud.form.hud.groupTitle') + ` (${name})`,
            content: {
                topLabel: Utils.i18n('tokenActionHud.form.hud.groupDetail'),
                placeholder: Utils.i18n('tokenActionHud.form.hud.tagPlaceholder'),
                settings: await actionHandler.getGroupSettings(groupData)
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
                    listName: choice.listName,
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
            await actionHandler.saveGroups({ saveActor: true, saveUser: true })
            Hooks.callAll('forceUpdateTokenActionHud')
        }

        TagDialog.showDialog(
            'topLevelGroup',
            nestId,
            tags,
            dialogData,
            dialogSubmit
        )
    }

    /**
     * Show action dialog
     * @public
     * @param {object} actionHandler The ActionHandler class
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
            title: `${Utils.i18n('tokenActionHud.form.hud.groupTitle')} (${name})`,
            content: {
                topLabel: Utils.i18n('tokenActionHud.form.hud.groupDetail'),
                placeholder: Utils.i18n('tokenActionHud.form.hud.tagPlaceholder'),
                settings: await actionHandler.getGroupSettings(groupData)
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
            const collapse = formData?.collapse
            const customWidth = formData?.customWidth
            const grid = formData?.grid
            const image = formData?.image
            const showTitle = formData?.showTitle
            const sort = formData?.sort
            const style = formData?.style
            groupData.settings = { characterCount, collapse, customWidth, grid, image, showTitle, sort, style }

            // Save subcategories to user action list
            await actionHandler.updateGroups(selectedGroups, groupData)
            await actionHandler.updateActions(selectedActions, groupData)
            await actionHandler.saveGroups({ saveActor: true, saveUser: true })

            Hooks.callAll('forceUpdateTokenActionHud')
        }

        TagDialog.showDialog(
            'group',
            nestId,
            tags,
            dialogData,
            dialogSubmit
        )
    }
}
