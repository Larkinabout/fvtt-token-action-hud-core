import { MODULE } from '../constants.js'
import { Logger, Utils } from '../utilities/utils.js'

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
            closeOnSubmit: true,
            id: 'token-action-hud-dialog',
            template: `modules/${MODULE.ID}/templates/tagdialog.hbs`,
            width: 500
        }

        const mergedOptions = foundry.utils.mergeObject(defaults, overrides)

        return mergedOptions
    }

    getData (options) {
        return this.content
    }

    /**
     * Activate listeners
     * @param {object} html The HTML element
     */
    activateListeners (html) {
        super.activateListeners(html)
        const cancel = html.find('#tah-dialog-cancel')
        cancel.on('click', this.close.bind(this))

        const resetActions = html.find('#tah-dialog-reset-actions')
        resetActions.on('click', this._resetActions)
    }

    /**
     * Show dialog
     * @public
     * @param {string} nestId          The nest id
     * @param {object} tags            The available and selected tags
     * @param {object} dialogData      The dialog data
     * @param {function*} dialogSubmit The dialog submit function
     */
    static showDialog (nestId, tags, dialogData, dialogSubmit) {
        this.nestId = nestId
        TagDialog._prepareHook(tags)

        const dialog = new TagDialog({
            title: dialogData.title,
            content: dialogData.content,
            submit: dialogSubmit
        })

        dialog.render(true)
    }

    /**
     * Prepare dialog hook
     * @param {object} tags The tags
     */
    static _prepareHook (tags) {
        Hooks.once('renderTagDialog', (app, html, options) => {
            html.css('height', 'auto')

            const $index = html.find('select[id="token-action-hud-index"]')
            if ($index.length > 0) {
                $index.css('background', '#fff')
                $index.css('color', '#000')
            }

            const $tagFilter = html.find('input[class="token-action-hud-taginput"]')

            if ($tagFilter.length > 0) {
                const options = {
                    delimiters: ';',
                    maxTags: 'Infinity',
                    dropdown: {
                        maxItems: 500, // <- maximum allowed rendered suggestions
                        classname: 'tags-look', // <- custom classname for this dropdown, so it could be targeted
                        enabled: 0, // <- show suggestions on focus
                        closeOnSelect: false // <- do not hide the suggestions dropdown once an item has been selected
                    }
                }

                if (tags.available) options.whitelist = tags.available

                TagDialog.tagify = new Tagify($tagFilter[0], options)

                TagDialog.dragSort = new DragSort(TagDialog.tagify.DOM.scope, {
                    selector: '.' + TagDialog.tagify.settings.classNames.tag,
                    callbacks: { dragEnd: onDragEnd }
                })

                function onDragEnd (elm) {
                    TagDialog.tagify.updateValueByDOMTags()
                }

                const $tagifyBox = $(document).find('.tagify')

                $tagifyBox.css('background', '#fff')
                $tagifyBox.css('color', '#000')

                if (tags.selected) TagDialog.tagify.addTags(tags.selected)

                // "remove all tags" button event listener
                const clearBtn = html.find('#tah-dialog-clear-tags')
                clearBtn.on('click', TagDialog.tagify.removeAllTags.bind(TagDialog.tagify))
            }
        })
    }

    async _resetActions () {
        const d = new Dialog({
            title: Utils.i18n('tokenActionHud.tagDialog.resetActions.dialog.title'),
            content: `<p>${Utils.i18n('tokenActionHud.tagDialog.resetActions.dialog.content')}</p>`,
            buttons: {
                yes: {
                    icon: '<i class="fas fa-check"></i>',
                    label: Utils.i18n('tokenActionHud.tagDialog.resetActions.dialog.buttons.yes'),
                    callback: async () => {
                        await game.tokenActionHud.resetActorFlag()
                        Logger.info('Actions reset', true)
                    }
                },
                no: {
                    icon: '<i class="fas fa-times"></i>',
                    label: Utils.i18n('tokenActionHud.tagDialog.resetActions.dialog.buttons.no')
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
