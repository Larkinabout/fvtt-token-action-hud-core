import Logger from '../logger.js'

const namespace = 'token-action-hud-core'

/**
 * Whether tbe user is allowed to use the HUD
 * @param {number} userRole The user's role
 * @returns {boolean}
 */
export function checkAllow (userRole) {
    const allowShow = getSetting('allow')
    if (userRole >= allowShow) return true
    return false
}

/**
 * Get setting value
 * @param {string} key The key
 * @param {string=null} defaultValue The default value
 * @returns The setting value
 */
export function getSetting (key, defaultValue = null) {
    let value = defaultValue ?? null
    if (game.settings.settings.get(`${namespace}.${key}`)) {
        value = game.settings.get(namespace, key)
    } else {
        Logger.debug(`Setting '${key}' not found`)
    }
    return value
}

/**
 * Set setting value
 * @param {string} key The key
 * @param {string} value The value
 */
export function setSetting (key, value) {
    if (game.settings.settings.get(`${namespace}.${key}`)) {
        value = game.settings.set(namespace, key, value)
        Logger.debug(`Setting '${key}' set to '${value}'`)
    } else {
        Logger.debug(`Setting '${key}' not found`)
    }
}

/**
 * Import a default class
 * @param {string} path The path of the file
 */
export async function importClass (path) {
    return await import(path).then(module => {
        return module.default
    })
}

/**
 * Enable stylesheet based on setting and disable all other stylesheets
 * @param {string} settingValue 'style' module setting value
 */
export function switchCSS (settingValue) {
    const styles = [
        { setting: 'compact', file: 'tah-compact' },
        { setting: 'foundryVTT', file: 'tah-foundry-vtt' },
        { setting: 'dorakoUI', file: 'tah-dorako' }
    ]

    for (const style of styles) {
        const href = ['modules/token-action-hud-core/', `styles/${style.file}`]
        if (style.setting === settingValue) {
            Object.values(document.styleSheets).find(
                (ss) => ss.href?.includes(href[0]) && ss.href?.includes(href[1])
            ).disabled = false
        } else {
            Object.values(document.styleSheets).find(
                (ss) => ss.href?.includes(href[0]) && ss.href?.includes(href[1])
            ).disabled = true
        }
    }
}

/**
 * Register Handlebar helpers
 */
export function registerHandlebars () {
    // Capitalise first character
    Handlebars.registerHelper('cap', function (string) {
        if (!string || string.length < 1) return ''
        return string[0].toUpperCase() + string.slice(1)
    })

    const reduceOp = function (args, reducer) {
        args = Array.from(args)
        args.pop() // => options
        const first = args.shift()
        return args.reduce(reducer, first)
    }

    // Support operators
    Handlebars.registerHelper({
        eq: function () { return reduceOp(arguments, (a, b) => a === b) },
        ne: function () { return reduceOp(arguments, (a, b) => a !== b) },
        lt: function () { return reduceOp(arguments, (a, b) => a < b) },
        gt: function () { return reduceOp(arguments, (a, b) => a > b) },
        lte: function () { return reduceOp(arguments, (a, b) => a <= b) },
        gte: function () { return reduceOp(arguments, (a, b) => a >= b) },
        and: function () { return reduceOp(arguments, (a, b) => a && b) },
        or: function () { return reduceOp(arguments, (a, b) => a || b) }
    })

    // Add asterisk to toggleable actions
    Handlebars.registerHelper('activeText', function (block) {
        if (getSetting('activeCssAsText')) {
            return block.fn(this)
        }
        return block.inverse(this)
    })
}

/**
 * Loop nested subcategories and return flattened
 * @param {object} subcategories
 * @returns {object}
 */
export function getSubcategories (subcategories) {
    const result = []
    for (const subcategory of subcategories) {
        if (subcategory.subcategories.length > 0) {
            result.push(getSubcategories(subcategory.subcategories).flat())
        }
        result.push(subcategory)
    }
    return result.flat()
}

/**
 * Loop nested subcategories, find subcategories matching id, and return flattened
 * @param {object} subcategories
 * @param {string} id
 * @returns {object}
 */
export function getSubcategoriesById (subcategories, id) {
    if (!subcategories) return
    const result = []
    for (const subcategory of subcategories) {
        if (subcategory.subcategories?.length > 0) {
            result.push(getSubcategoriesById(subcategory.subcategories, id).flat())
        }
        if (subcategory.id === id) {
            result.push(subcategory)
        }
    }
    return result.flat()
}

/**
 * Loop nested subcategories, find subcategories matching nestId, and return flattened
 * @param {object} subcategories
 * @param {string} nestId
 * @returns {object}
 */
export function getSubcategoryByNestId (subcategories, nestId) {
    for (const subcategory of subcategories) {
        if (subcategory.nestId === nestId) {
            return subcategory
        } else if (subcategory.subcategories.length > 0) {
            const result = getSubcategoryByNestId(subcategory.subcategories, nestId)
            if (result) return result
        }
    }
}
