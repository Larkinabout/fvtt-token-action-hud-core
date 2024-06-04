import { CUSTOM_STYLE, MODULE, LAYOUT_SETTING, TEMPLATE } from '../constants.js'
import { Utils } from '../utils.js'

export class TahSettingsForm extends FormApplication {
    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: TEMPLATE.settings,
            id: 'token-action-hud-core-settings',
            width: 600,
            height: 'auto',
            closeOnSubmit: true
        })
    }

    constructor (...args) {
        super(args)
    }

    async getData () {
        const settings = []
        for (const [key, setting] of Object.entries(this.settings)) {
            if (setting?.scope === 'world' && !game.user.isGM) continue
            const id = key
            const hint = Utils.i18n(setting.hint)
            const icon = setting.icon
            const label = Utils.i18n(setting.label)
            const name = Utils.i18n(setting.name)
            const value = (setting?.scope)
                ? (setting?.scope === 'user')
                    ? await Utils.getUserFlag(key)
                    : await Utils.getSetting(key)
                : ''
            const type = setting.type instanceof Function ? setting.type.name : 'String'
            const isButton = setting.inputType === 'button'
            const onClick = setting.onClick
            const isCheckbox = setting.inputType === 'checkbox'
            const isFilePicker = setting.inputType === 'filePicker'
            const filePickerType = (setting.inputType === 'filePicker') ? type ?? 'any' : ''
            const isNumber = setting.inputType === 'number'
            const isRange = (setting.inputType === 'range') && setting.range
            const isSelect = setting.choices !== undefined
            settings.push({
                id,
                hint,
                icon,
                label,
                name,
                value,
                type,
                isButton,
                onClick,
                isCheckbox,
                isFilePicker,
                filePickerType,
                isNumber,
                isRange,
                isSelect
            })
        }
        return { settings }
    }

    activateListeners (html) {
        super.activateListeners(html)

        super.activateListeners(html)
        const cancel = html.find('#tah-form-cancel')
        cancel.on('click', this.close.bind(this))
    }

    async _updateObject (event, formData) {
        for (const [key, value] of Object.entries(formData)) {
            switch (this.settings[key].scope) {
            case 'client':
            case 'world':
                await Utils.setSetting(key, value)
                break
            case 'user':
                await Utils.setUserFlag(key, value)
            }

            await game.tokenActionHud.updateSettings(key, value)
        }

        game.tokenActionHud.update()
    }
}

export class TahSettingsFormLayout extends TahSettingsForm {
    constructor () {
        super()
        this.settings = LAYOUT_SETTING
    }

    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: Utils.i18n('tokenActionHud.settings.layout.form.title')
        })
    }
}
