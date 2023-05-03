/**
 * Module-based constants
 */
export const MODULE = {
    ID: 'token-action-hud-core',
    NAME: 'Token Action HUD'
}

/**
 * Delimiter character
 */
export const DELIMITER = '|'

/**
 * Action type
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
    compact: { file: 'tah-compact' },
    dorakoUI: { file: 'tah-dorako' },
    foundryVTT: { file: 'tah-foundry-vtt' },
    highContrast: { file: 'tah-high-contrast' },
    pathfinder: { file: 'tah-pathfinder' },
    custom: { file: 'tah-custom' }
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

export const ITEM_MACRO_ICON = {
    ICON: 'fas fa-sd-card',
    TOOLTIP: 'Item Macro'
}

export const STYLE_CLASS = {
    compact: {
        class: 'tah-style-foundry-vtt',
        primaryColor: '#dddddd',
        secondaryColor: '#dddddd80',
        tertiaryColor: '#ff6400'
    },
    custom: { class: 'tah-style-custom' },
    dorakoUI: { class: 'tah-style-dorako-ui' },
    foundryVTT: {
        class: 'tah-style-foundry-vtt',
        primaryColor: '#dddddd',
        secondaryColor: '#dddddd80',
        tertiaryColor: '#ff6400'
    },
    highContrast: {
        class: 'tah-style-high-contrast',
        primaryColor: '#ffff00',
        secondaryColor: '#ffff00',
        tertiaryColor: '#0C7BDC'
    },
    pathfinder: { class: 'tah-style-pathfinder' }
}
