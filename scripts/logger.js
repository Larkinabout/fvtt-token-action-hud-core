import { getSetting } from './utilities/utils.js'

export default class Logger {
    static info (...args) {
        console.log('Token Action HUD Info |', ...args)
    }

    static error (...args) {
        console.error('Token Action HUD Error |', ...args)
    }

    static debug (...args) {
        if (getSetting('debug')) { console.log('Token Action HUD Debug |', ...args) }
    }
}
