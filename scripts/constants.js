/**
 * Module-based constants
 */
export const MODULE = {
    ID: 'token-action-hud-core',
    NAME: 'Token Action HUD'
}

/**
 * Template directory
 */
const TEMPLATE_DIR = `modules/${MODULE.ID}/templates`

/**
 * Templates
 */
export const TEMPLATE = {
    action: `${TEMPLATE_DIR}/action.hbs`,
    customStyleForm: `${TEMPLATE_DIR}/custom-style-form.hbs`,
    group: `${TEMPLATE_DIR}/group.hbs`,
    hud: `${TEMPLATE_DIR}/hud.hbs`,
    listGroup: `${TEMPLATE_DIR}/list-group.hbs`,
    settings: `${TEMPLATE_DIR}/settings.hbs`,
    tabGroup: `${TEMPLATE_DIR}/tab-group.hbs`,
    tagDialogGroup: `${TEMPLATE_DIR}/tag-dialog-group.hbs`,
    tagDialogHud: `${TEMPLATE_DIR}/tag-dialog-hud.hbs`,
    tagDialogTopLevelGroup: `${TEMPLATE_DIR}/tag-dialog-top-level-group.hbs`
}

/**
 * Delimiter character
 */
export const DELIMITER = '|'

/**
 * Action types
 */
export const ACTION_TYPE = {
    compendiumEntry: 'tokenActionHud.compendiumEntry',
    compendiumMacro: 'tokenActionHud.compendiumMacro',
    compendiumPlaylist: 'tokenActionHud.compendiumPlaylist',
    macro: 'tokenActionHud.macro'
}

/**
 * Compendium action types
 */
export const COMPENDIUM_ACTION_TYPES = ['compendiumEntry', 'compendiumMacro', 'compendiumPlaylist', 'macro']

/**
 * Compendium pack types
 */
export const COMPENDIUM_PACK_TYPES = ['JournalEntry', 'Macro', 'RollTable']

/**
 * CSS styles
 */
export const CSS_STYLE = {
    foundryVTT: {
        class: 'tah-style-foundry-vtt-dark',
        file: 'tah-foundry-vtt-dark',
        moduleId: MODULE.ID,
        name: 'Foundry VTT Dark',
        primaryColor: '#dddddd',
        secondaryColor: '#dddddd80',
        tertiaryColor: '#ff6400'
    },
    foundryVttLight: {
        class: 'tah-style-foundry-vtt-light',
        file: 'tah-foundry-vtt-light',
        moduleId: MODULE.ID,
        name: 'Foundry VTT Light',
        primaryColor: '#dddddd',
        secondaryColor: '#dddddd80',
        tertiaryColor: '#ff6400'
    },
    compact: {
        class: 'tah-style-foundry-vtt',
        file: 'tah-compact',
        moduleId: MODULE.ID,
        name: 'Foundry VTT Compact',
        primaryColor: '#dddddd',
        secondaryColor: '#dddddd80',
        tertiaryColor: '#ff6400'
    },
    dorakoUI: {
        class: 'tah-style-dorako-ui',
        file: 'tah-dorako',
        moduleId: MODULE.ID,
        name: 'Dorako UI'
    },
    pathfinder: {
        class: 'tah-style-pathfinder',
        file: 'tah-pathfinder',
        moduleId: MODULE.ID,
        name: 'Pathfinder'
    },
    highContrast: {
        class: 'tah-style-high-contrast',
        file: 'tah-high-contrast',
        moduleId: MODULE.ID,
        name: 'High Contrast',
        primaryColor: '#ffff00',
        secondaryColor: '#ffff00',
        tertiaryColor: '#0C7BDC'
    },
    custom: {
        class: 'tah-style-custom',
        file: 'tah-custom',
        moduleId: MODULE.ID,
        name: 'Custom'
    },
}

/**
 * Custom styles
 */
export const CUSTOM_STYLE = {
    backgroundColor: { cssProperty: '--tah-background-color', type: String, default: '#00000000' },
    buttonHeight: { cssProperty: '--tah-button-height-editable', type: Number, default: 32 },
    buttonBackgroundColor: { cssProperty: '--tah-button-background-color-editable', type: String, default: '#000000b3' },
    buttonBorderPrimaryColor: { cssProperty: '--tah-button-border-primary-color-editable', type: String, default: '#0C0C0CFF' },
    buttonBorderSecondaryColor: { cssProperty: '--tah-button-border-secondary-color-editable', type: String, default: '#060606FF' },
    buttonTextColor: { cssProperty: '--tah-button-text-color-editable', type: String, default: '#DDDDDDFF' },
    buttonHoverBorderPrimaryColor: { cssProperty: '--tah-button-hover-border-primary-color-editable', type: String, default: '#FF6400FF' },
    buttonHoverBorderSecondaryColor: { cssProperty: '--tah-button-hover-border-secondary-color-editable', type: String, default: '#FF0000FF' },
    buttonHoverBackgroundColor: { cssProperty: '--tah-button-hover-background-color-editable', type: String, default: '#000000B3' },
    buttonHoverTextColor: { cssProperty: '--tah-button-hover-text-color-editable', type: String, default: '#FFFFFFFF' },
    buttonToggleActiveBackgroundColor: { cssProperty: '--tah-button-toggle-active-background-color-editable', type: String, default: '#3C0078BF' },
    buttonToggleActiveBorderPrimaryColor: { cssProperty: '--tah-button-toggle-active-border-primary-color-editable', type: String, default: '#9B8DFFFF' },
    buttonToggleActiveBorderSecondaryColor: { cssProperty: '--tah-button-toggle-active-border-secondary-color-editable', type: String, default: '#9B8DFFFF' },
    buttonToggleActiveTextColor: { cssProperty: '--tah-button-toggle-active-text-color-editable', type: String, default: '#FFFFFFFF' },
    buttonToggleHoverBackgroundColor: { cssProperty: '--tah-button-toggle-hover-background-color-editable', type: String, default: '#3C0078BF' },
    buttonToggleHoverBorderPrimaryColor: { cssProperty: '--tah-button-toggle-hover-border-primary-color-editable', type: String, default: '#9B8DFFFF' },
    buttonToggleHoverBorderSecondaryColor: { cssProperty: '--tah-button-toggle-hover-secondary-color-editable', type: String, default: '#9B8DFFFF' },
    buttonToggleHoverTextColor: { cssProperty: '--tah-button-toggle-hover-text-color-editable', type: String, default: '#FFFFFFFF' },
    textPrimaryColor: { cssProperty: '--tah-text-primary-color-editable', type: String, default: '#DDDDDDFF' },
    textSecondaryColor: { cssProperty: '--tah-text-secondary-color-editable', type: String, default: '#DDDDDD80' },
    textTertiaryColor: { cssProperty: '--tah-text-tertiary-color-editable', type: String, default: '#FF6400FF' },
    textHoverPrimaryColor: { cssProperty: '--tah-text-hover-primary-color-editable', type: String, default: '#DDDDDDFF' },
    textHoverSecondaryColor: { cssProperty: '--tah-text-hover-secondary-color-editable', type: String, default: '#DDDDDD80' },
    textHoverTertiaryColor: { cssProperty: '--tah-text-tertiary-color-editable', type: String, default: '#FF6400FF' }
}

/**
 * Group types
 */
export const GROUP_TYPE = {
    COMPENDIUM: 'compendium',
    CUSTOM: 'custom',
    SYSTEM: 'system',
    SYSTEM_DERIVED: 'system-derived'
}

/**
 * Item Macro icon
 */
export const ITEM_MACRO_ICON = {
    ICON: 'fas fa-sd-card',
    TOOLTIP: 'Item Macro'
}

/**
 * Layout settings
 */
export const LAYOUT_SETTING = {
    customLayout: {
        hint: 'tokenActionHud.settings.customLayout.hint',
        name: 'tokenActionHud.settings.customLayout.name',
        inputType: 'filePicker',
        filePickerType: 'json',
        dtype: 'String',
        scope: 'world'
    },
    userCustomLayout: {
        hint: 'tokenActionHud.settings.userCustomLayout.hint',
        name: 'tokenActionHud.settings.userCustomLayout.name',
        inputType: 'filePicker',
        filePickerType: 'json',
        dtype: 'String',
        scope: 'user'
    },
    exportLayout: {
        hint: 'tokenActionHud.settings.exportLayout.hint',
        label: 'tokenActionHud.settings.exportLayout.label',
        name: 'tokenActionHud.settings.exportLayout.name',
        inputType: 'button',
        icon: 'fa-solid fa-file-export',
        onClick: 'game?.tokenActionHud?.actionHandler?.exportLayout()'
    },
    resetLayout: {
        hint: 'tokenActionHud.settings.resetLayout.hint',
        label: 'tokenActionHud.settings.resetLayout.label',
        name: 'tokenActionHud.settings.resetLayout.name',
        inputType: 'button',
        icon: 'fa-solid fa-arrow-rotate-left',
        onClick: 'game?.tokenActionHud?.resetDialog()',
        scope: 'client'
    },
    resetAllLayouts: {
        hint: 'tokenActionHud.settings.resetAllLayouts.hint',
        label: 'tokenActionHud.settings.resetAllLayouts.label',
        name: 'tokenActionHud.settings.resetAllLayouts.name',
        inputType: 'button',
        icon: 'fa-solid fa-bomb',
        onClick: 'game?.tokenActionHud?.resetAllDialog()',
        scope: 'world'
    }
}

/**
 * Settings
 */
export const SETTING = {
    activeCssAsText: { classes: ['TokenActionHud'], variable: 'activeCssAsTextSetting' },
    allow: { classes: ['TokenActionHud'], variable: 'allowSetting' },
    alwaysShowHud: { classes: ['TokenActionHud'], variable: 'alwaysShowHudSetting' },
    backgroundColor: {},
    buttonBackgroundColor: {},
    buttonBorderPrimaryColor: {},
    buttonBorderSecondaryColor: {},
    buttonHeight: {},
    buttonHoverBorderPrimaryColor: {},
    buttonHoverBorderSecondaryColor: {},
    buttonHoverBackgroundColor: {},
    buttonHoverTextColor: {},
    buttonTextColor: {},
    buttonToggleActiveBackgroundColor: {},
    buttonToggleActiveBorderPrimaryColor: {},
    buttonToggleActiveBorderSecondaryColor: {},
    buttonToggleActiveTextColor: {},
    buttonToggleHoverBackgroundColor: {},
    buttonToggleHoverBorderPrimaryColor: {},
    buttonToggleHoverBorderSecondaryColor: {},
    buttonToggleHoverTextColor: {},
    clickOpenCategory: { classes: ['TokenActionHud'], variable: 'clickOpenCategorySetting' },
    customLayout: { classes: ['ActionHandler'], variable: 'customLayoutSetting' },
    customStyle: {},
    debug: { classes: ['TokenActionHud'], variable: 'debugSetting' },
    direction: { classes: ['TokenActionHud'], variable: 'directionSetting' },
    displayCharacterName: { classes: ['TokenActionHud'], variable: 'displayCharacterName' },
    displayIcons: { classes: ['TokenActionHud'], variable: 'displayIconsSetting' },
    drag: { classes: ['TokenActionHud'], variable: 'dragSetting' },
    enable: { classes: ['TokenActionHud'], variable: 'enableSetting' },
    enableCustomization: { classes: ['ActionHandler', 'TokenActionHud'], variable: 'enableCustomizationSetting' },
    grid: { classes: ['TokenActionHud'], variable: 'gridSetting' },
    itemMacro: {},
    migrationVersion: {},
    reset: {},
    renderItemOnRightClick: {},
    rollHandler: { default: 'core' },
    scale: { classes: ['TokenActionHud'], variable: 'scaleSetting' },
    sortActions: { classes: ['ActionHandler'], variable: 'sortActionsSetting' },
    startup: {},
    style: {},
    tooltips: { classes: ['ActionHandler'], variable: 'tooltipsSetting' },
    textPrimaryColor: {},
    textSecondaryColor: {},
    textTertiaryColor: {},
    textHoverPrimaryColor: {},
    textHoverSecondaryColor: {},
    textHoverTertiaryColor: {},
    userCustomLayout: { classes: ['ActionHandler'], variable: 'userCustomLayoutFlag' }
}
