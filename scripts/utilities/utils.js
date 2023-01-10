const namespace = 'token-action-hud-core'

/**
 * Console logger
 */
export class Logger {
    static info (...args) {
        console.log('Token Action HUD Info |', ...args)
    }

    static error (...args) {
        console.error('Token Action HUD Error |', ...args)
    }

    static debug (...args) {
        const isDebug = (game.tokenActionHud) ? game.tokenActionHud.isDebug : getSetting('debug')
        if (isDebug) { console.log('Token Action HUD Debug |', ...args) }
    }
}

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
    try {
        value = game.settings.get(namespace, key)
    } catch {
        Logger.debug(`Setting '${key}' not found`)
    }
    return value
}

/**
 * Set setting value
 * @param {string} key The key
 * @param {string} value The value
 */
export async function setSetting (key, value) {
    if (game.settings.settings.get(`${namespace}.${key}`)) {
        value = await game.settings.set(namespace, key, value)
        Logger.debug(`Setting '${key}' set to '${value}'`)
    } else {
        Logger.debug(`Setting '${key}' not found`)
    }
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
export async function getSubcategoryByNestId (subcategories, nestId) {
    const parts = nestId.split('_')
    const subcategory = await getSubcategoryByParts(subcategories, parts)
    return subcategory

    async function getSubcategoryByParts (subcategories, parts) {
        const subcategory = subcategories.find(subcategory => subcategory.id === parts[0])
        if (subcategory) {
            if (parts.length > 1) {
                parts.shift()
                return await getSubcategoryByParts(Object.values(subcategory.subcategories), parts)
            } else {
                return subcategory
            }
        }
        return null
    }
}
