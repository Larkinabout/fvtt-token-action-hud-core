import { getSetting } from './utilities/utils.js'

export default class Logger {
    static info (...args) {
        console.log('Token Action Hud Info |', ...args)
    }

    static error (...args) {
        console.error('Token Action Hud Error |', ...args)
    }

    static debug (...args) {
        if (getSetting('debug')) { console.log('Token Action Hud Debug |', ...args) }
    }
}
