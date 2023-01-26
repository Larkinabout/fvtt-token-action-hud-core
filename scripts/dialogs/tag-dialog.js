import { MODULE } from '../constants.js'

export class TagDialog extends Dialog {
    i18n = (toTranslate) => game.i18n.localize(toTranslate)
    tagify = null
    dragSort = null

    constructor (data, options) {
        super(options)
        this.data = data
        this.categoryId = null
        this.subcategoryId = null
    }

    /**
     * Show dialog
     * @public
     * @param {string} nestId          The nested subcategory ID
     * @param {object} tags            The available and selected tags
     * @param {object} dialogData      The dialog data
     * @param {function*} dialogSubmit The dialog submit function
     */
    static showDialog (nestId, tags, dialogData, dialogSubmit) {
        this.nestId = nestId
        TagDialog._prepareHook(tags)

        const template = Handlebars.compile(`{{> modules/${MODULE.ID}/templates/tagdialog.hbs}}`)

        const dialog = new TagDialog({
            title: dialogData.title,
            content: template(dialogData.content),
            buttons: {
                accept: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize('tokenActionHud.accept'),
                    callback: async (html) => {
                        const selection = TagDialog.tagify.value.map((c) => {
                            c.id = c.id ?? c.value.slugify({ replacement: '-', strict: true })
                            return {
                                id: c.id,
                                name: c.value,
                                type: c.type,
                                level: c.level,
                                hasDerivedSubcategories: c.hasDerivedSubcategories
                            }
                        })
                        await dialogSubmit(selection, html)
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize('tokenActionHud.cancel')
                }
            },
            default: 'accept'
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
                        maxItems: 50, // <- maximum allowed rendered suggestions
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
                const clearBtn = html.find('button[class="tags--removeAllBtn"]')
                clearBtn.on('click', TagDialog.tagify.removeAllTags.bind(TagDialog.tagify))
            }
        })
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
}
