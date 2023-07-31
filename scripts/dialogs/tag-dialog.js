import { MODULE, TEMPLATE } from '../constants.js'
import { Logger, Utils } from '../utils.js'
import DragSort from '@yaireo/dragsort'
import Tagify from '@yaireo/tagify'

/**
 * Form Application for the dialogs.
 */
export class TagDialog extends FormApplication {
    tagify = null
    dragSort = null

    constructor (data) {
        super(data, { title: data.title })
        this.content = data.content
        this.submit = data.submit
        this.categoryId = null
        this.subcategoryId = null
    }

    static get defaultOptions () {
        const defaults = super.defaultOptions
        const overrides = {
            classes: ['tah-dialog', 'sheet'],
            closeOnSubmit: true,
            id: 'token-action-hud-dialog',
            popOut: true,
            resizable: true,
            height: 'auto',
            width: 600
        }

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides)

        return mergedOptions
    }

    getData (options) {
        return this.content
    }

    /**
     * Activate listeners
     * @public
     * @param {object} html The HTML element
     */
    activateListeners (html) {
        super.activateListeners(html)
        const cancel = html.find('#tah-form-cancel')
        cancel.on('click', this.close.bind(this))

        const resetActions = html.find('#tah-dialog-reset-actions')
        resetActions.on('click', this.#resetActions)
    }

    /**
     * Show dialog
     * @public
     * @param {string} dialogType      The dialog type
     * @param {string} nestId          The nest id
     * @param {object} tags            The available and selected tags
     * @param {object} dialogData      The dialog data
     * @param {function*} dialogSubmit The dialog submit function
     */
    static showDialog (dialogType, nestId, tags, dialogData, dialogSubmit) {
        this.nestId = nestId
        TagDialog._prepareHook(tags)

        const data = {
            title: dialogData.title,
            content: dialogData.content,
            submit: dialogSubmit
        }

        let dialog
        switch (dialogType) {
        case 'hud':
            dialog = new TagDialogHud(data)
            break
        case 'topLevelGroup':
            dialog = new TagDialogTopLevelGroup(data)
            break
        case 'group':
            dialog = new TagDialogGroup(data)
            break
        }

        dialog.render(true)
    }

    /**
     * Prepare dialog hook
     * @private
     * @param {object} tags The tags
     */
    static _prepareHook (tags) {
        Hooks.once('renderTagDialog', (app, html, options) => {
            const $tagFilter = html.find('input[class="tah-dialog-tagify"]')

            if ($tagFilter.length > 0) {
                const tagifyOptions = {
                    delimiters: ';',
                    maxTags: 'Infinity',
                    dropdown: {
                        position: 'manual',
                        maxItems: Infinity, // <- maximum allowed rendered suggestions
                        classname: 'tah-dialog-tags-dropdown', // <- custom classname for this dropdown, so it could be targeted
                        enabled: 0 // <- show suggestions on focus
                    },
                    templates: {
                        dropdownItemNoMatch () {
                            return '<div class=\'empty\'>Nothing Found</div>'
                        }
                    }
                }

                if (tags.available) tagifyOptions.whitelist = tags.available
                TagDialog.tagify = new Tagify($tagFilter[0], tagifyOptions)

                if (tags.selected) TagDialog.tagify.addTags(tags.selected)

                TagDialog.dragSort = new DragSort(TagDialog.tagify.DOM.scope, {
                    selector: '.' + TagDialog.tagify.settings.classNames.tag,
                    callbacks: { dragEnd: onDragEnd }
                })

                function onDragEnd (elm) {
                    TagDialog.tagify.updateValueByDOMTags()
                }

                html.find('.tagify__input').on('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault()
                        TagDialog.tagify.addTags(TagDialog.tagify.state.inputText, !0)
                    }
                })

                // "remove all tags" button event listener
                const unselectAllButton = html.find('#tah-dialog-unselect-all')
                unselectAllButton.on('click', TagDialog.tagify.removeAllTags.bind(TagDialog.tagify))

                if (app.constructor.name === 'TagDialogHud') return

                TagDialog.tagify.dropdown.show()
                const dropdownLabelElement = document.createElement('div')
                dropdownLabelElement.classList.add('tah-dialog-label')
                dropdownLabelElement.innerHTML = Utils.i18n('tokenActionHud.form.hud.availableItems')
                TagDialog.tagify.DOM.scope.parentNode.appendChild(dropdownLabelElement)
                TagDialog.tagify.DOM.scope.parentNode.appendChild(TagDialog.tagify.DOM.dropdown)
            }
        })

        Hooks.on('renderApplication', (app, html, options) => {
            if (app.constructor.name.startsWith('TagDialog')) {
                app.setPosition()
                app.setPosition({ top: 50 })
            }
        })
    }

    /**
     * Reset actions
     * @private
     */
    async #resetActions () {
        const d = new Dialog({
            title: Utils.i18n('tokenActionHud.dialog.resetActions.title'),
            content: `<p>${Utils.i18n('tokenActionHud.dialog.resetActions.content')}</p>`,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: Utils.i18n('tokenActionHud.dialog.button.yes'),
                    callback: async () => {
                        await game.tokenActionHud.resetActorData()
                        Logger.info('Actions reset', true)
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: Utils.i18n('tokenActionHud.dialog.button.no')
                }
            }
        })
        d.render(true)
    }

    /** @override */
    _onKeyDown (event) {
    // Close dialog
        if (event.key === 'Escape' && !event.target.className.includes('tagify')) {
            event.preventDefault()
            event.stopPropagation()
            return this.close()
        }

        // Confirm default choice
        if (
            event.key === 'Enter' &&
            this.data.default &&
            !event.target.className.includes('tagify')
        ) {
            event.preventDefault()
            event.stopPropagation()
            const defaultChoice = this.data.buttons[this.data.default]
            return this.submit(defaultChoice)
        }
    }

    /**
     * Handle form submission
     * @param {object} event       The event
     * @param {object} formDataThe form data
     */
    async _updateObject (event, formData) {
        const selection = TagDialog.tagify.value.map((c) => {
            c.id = c.id ?? c.value.slugify({ replacement: '-', strict: true })
            return {
                id: c.id,
                listName: c.value,
                name: c.name ?? c.value,
                type: c.type
            }
        })
        await this.submit(selection, formData)
    }
}

export class TagDialogHud extends TagDialog {
    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions,
            {
                template: TEMPLATE.tagDialogHud
            })
    }
}

export class TagDialogTopLevelGroup extends TagDialog {
    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: TEMPLATE.tagDialogTopLevelGroup,
            tabs: [{
                navSelector: '.tabs',
                contentSelector: 'form',
                initial: 'groups'
            }]
        })
    }
}

export class TagDialogGroup extends TagDialog {
    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: TEMPLATE.tagDialogGroup,
            tabs: [{
                navSelector: '.tabs',
                contentSelector: 'form',
                initial: 'groups'
            }]
        })
    }
}
