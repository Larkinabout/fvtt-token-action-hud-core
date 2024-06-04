import { CUSTOM_STYLE, MODULE, TEMPLATE } from '../constants.js'
import { Utils } from '../utils.js'

export class CustomStyleForm extends FormApplication {
    static get defaultOptions () {
        return foundry.utils.mergeObject(super.defaultOptions, {
            title: Utils.i18n('tokenActionHud.settings.customStyle.form.title'),
            template: TEMPLATE.customStyleForm,
            id: 'token-action-hud-core-settings',
            width: 600,
            height: 600,
            popOut: true,
            resizable: true,
            closeOnSubmit: true
        })
    }

    constructor (...args) {
        super(args)
    }

    getData () {
        this.data = {
            backgroundColor: Utils.getSetting('backgroundColor', CUSTOM_STYLE.backgroundColor.default),
            buttonHeight: Utils.getSetting('buttonHeight', CUSTOM_STYLE.buttonHeight.default),
            buttonBackgroundColor: Utils.getSetting('buttonBackgroundColor', CUSTOM_STYLE.buttonBackgroundColor.default),
            buttonHoverBackgroundColor: Utils.getSetting('buttonHoverBackgroundColor', CUSTOM_STYLE.buttonHoverBackgroundColor.default),
            buttonToggleActiveBackgroundColor: Utils.getSetting('buttonToggleActiveBackgroundColor', CUSTOM_STYLE.buttonToggleActiveBackgroundColor.default),
            buttonToggleHoverBackgroundColor: Utils.getSetting('buttonToggleHoverBackgroundColor', CUSTOM_STYLE.buttonToggleHoverBackgroundColor.default),
            buttonTextColor: Utils.getSetting('buttonTextColor', CUSTOM_STYLE.buttonTextColor.default),
            buttonHoverTextColor: Utils.getSetting('buttonHoverTextColor', CUSTOM_STYLE.buttonHoverTextColor.default),
            buttonToggleActiveTextColor: Utils.getSetting('buttonToggleActiveTextColor', CUSTOM_STYLE.buttonToggleActiveTextColor.default),
            buttonToggleHoverTextColor: Utils.getSetting('buttonToggleHoverTextColor', CUSTOM_STYLE.buttonToggleHoverTextColor.default),
            buttonBorderPrimaryColor: Utils.getSetting('buttonBorderPrimaryColor', CUSTOM_STYLE.buttonBorderPrimaryColor.default),
            buttonBorderSecondaryColor: Utils.getSetting('buttonBorderSecondaryColor', CUSTOM_STYLE.buttonBorderSecondaryColor.default),
            buttonHoverBorderPrimaryColor: Utils.getSetting('buttonHoverBorderPrimaryColor', CUSTOM_STYLE.buttonHoverBorderPrimaryColor.default),
            buttonHoverBorderSecondaryColor: Utils.getSetting('buttonHoverBorderSecondaryColor', CUSTOM_STYLE.buttonHoverBorderSecondaryColor.default),
            buttonToggleActiveBorderPrimaryColor: Utils.getSetting('buttonToggleActiveBorderPrimaryColor', CUSTOM_STYLE.buttonToggleActiveBorderPrimaryColor.default),
            buttonToggleActiveBorderSecondaryColor: Utils.getSetting('buttonToggleActiveBorderSecondaryColor', CUSTOM_STYLE.buttonToggleActiveBorderSecondaryColor.default),
            buttonToggleHoverBorderPrimaryColor: Utils.getSetting('buttonToggleHoverBorderPrimaryColor', CUSTOM_STYLE.buttonToggleHoverBorderPrimaryColor.default),
            buttonToggleHoverBorderSecondaryColor: Utils.getSetting('buttonToggleHoverBorderSecondaryColor', CUSTOM_STYLE.buttonToggleHoverBorderSecondaryColor.default),
            textPrimaryColor: Utils.getSetting('textPrimaryColor', CUSTOM_STYLE.textPrimaryColor.default),
            textSecondaryColor: Utils.getSetting('textSecondaryColor', CUSTOM_STYLE.textSecondaryColor.default),
            textTertiaryColor: Utils.getSetting('textTertiaryColor', CUSTOM_STYLE.textTertiaryColor.default),
            textHoverPrimaryColor: Utils.getSetting('textHoverPrimaryColor', CUSTOM_STYLE.textHoverPrimaryColor.default),
            textHoverSecondaryColor: Utils.getSetting('textHoverSecondaryColor', CUSTOM_STYLE.textHoverSecondaryColor.default),
            textHoverTertiaryColor: Utils.getSetting('textHoverTertiaryColor', CUSTOM_STYLE.textHoverTertiaryColor.default)
        }
        return this.data
    }

    activateListeners (html) {
        super.activateListeners(html)

        const resetButtonElement = html.find('#tah-custom-style-reset-button')
        resetButtonElement.on('click', this._reset.bind(this))

        if (typeof ColorPicker !== 'undefined') { ColorPicker.install() }
    }

    _reset () {
        for (const [key, value] of Object.entries(CUSTOM_STYLE)) {
            Utils.setSetting(key, value.default)
            document.querySelector(':root').style.setProperty(value.cssProperty, value.default)
        }
        this.render(true)
    }

    _updateObject (event, formData) {
        for (const [key, value] of Object.entries(formData)) {
            const customStyle = CUSTOM_STYLE[key]
            if (value !== this.data[key]) {
                Utils.setSetting(key, value)
                document.querySelector(':root').style.setProperty(customStyle.cssProperty, value)
            }
        }
    }
}
