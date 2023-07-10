import { MODULE } from './constants.js'
import { Logger } from './utilities/utils.js'

export class DataHandler {
    static isPersistentStorage () {
        return (game.version >= '11.305' && typeof ForgeVTT === 'undefined')
    }

    /**
     * Create directories
     */
    static async createDirectories () {
        const DATA_FOLDER = 'data'
        const moduleDirectory = (DataHandler.isPersistentStorage())
            ? `modules/${MODULE.ID}/storage`
            : MODULE.ID
        await FilePicker.browse(DATA_FOLDER, moduleDirectory)
            .catch(async _ => {
                if (!await FilePicker.createDirectory(DATA_FOLDER, moduleDirectory, {})) {
                    Logger.debug('Failed to create directory: ' + moduleDirectory)
                }
            })
        const worldDirectory = `${moduleDirectory}/${game.world.id}`
        await FilePicker.browse(DATA_FOLDER, worldDirectory)
            .catch(async _ => {
                if (!await FilePicker.createDirectory(DATA_FOLDER, worldDirectory, {})) {
                    Logger.debug('Failed to create directory: ' + worldDirectory)
                }
            })
        const actorDirectory = `${worldDirectory}/actor`
        await FilePicker.browse(DATA_FOLDER, actorDirectory)
            .catch(async _ => {
                if (!await FilePicker.createDirectory(DATA_FOLDER, actorDirectory, {})) {
                    Logger.debug('Failed to create directory: ' + actorDirectory)
                }
            })
        const userDirectory = `${worldDirectory}/user`
        await FilePicker.browse(DATA_FOLDER, userDirectory)
            .catch(async _ => {
                if (!await FilePicker.createDirectory(DATA_FOLDER, userDirectory, {})) {
                    Logger.debug('Failed to create directory: ' + userDirectory)
                }
            })
    }

    /**
     * Save data
     * @param {string} type The type: actor or user
     * @param {string} id   The actor or user id
     * @param {object} data The data
     */
    static async saveData (type, id, data) {
        // Get the folder path
        const folderPath = (DataHandler.isPersistentStorage())
            ? `modules/${MODULE.ID}/storage/${game.world.id}/${type}`
            : `${MODULE.ID}/${game.world.id}/${type}`
        // Generate the system safe filename
        const fileName = encodeURI(`${id}.json`)
        // Create the File and contents
        const file = new File([JSON.stringify(data, null, '')], fileName, { type: 'application/json' })
        const response = await FilePicker.upload('data', folderPath, file, {}, { notify: false })
        if (!response.path) {
            Logger.debug(`Failed to save data to: ${fileName}\nReason: ${response}`)
        }
    }

    /**
     * Get data
     * @param {string} type The type: actor or user
     * @param {string} id   The actor or user id
     * @returns {object}    The data
     */
    static async getData (type, id) {
        const folderPath = (DataHandler.isPersistentStorage())
            ? `modules/${MODULE.ID}/storage/${game.world.id}/${type}`
            : `${MODULE.ID}/${game.world.id}/${type}`
        const fileName = encodeURI(`${id}.json`)
        try {
            const foundFolderPath = await FilePicker.browse('data', folderPath)
            const foundFilePath = foundFolderPath.files.find(file => file.endsWith(fileName))
            if (foundFilePath) {
                const ms = Date.now()
                return await fetch(`${foundFilePath}?ms=${ms}`)
                    .then(response => {
                        if (response.ok) {
                            return response.json()
                        } else {
                            return null
                        }
                    })
                    .catch(error => {
                        console.error(error)
                    })
            } else {
                return null
            }
        } catch {
            return null
        }
    }

    /**
     * Save data
     * @param {string} type The type: actor or user
     * @param {string} id   The actor or user id
     * @param {object} data The data
     */
    static async saveDataMigrate (type, id, data) {
        // Get the folder path
        const folderPath = `${MODULE.ID}/${game.world.id}/${type}`
        // Generate the system safe filename
        const fileName = encodeURI(`${id}.json`)
        // Create the File and contents
        const file = new File([JSON.stringify(data, null, '')], fileName, { type: 'application/json' })
        const response = await FilePicker.upload('data', folderPath, file, {}, { notify: false })
        if (!response.path) {
            Logger.debug(`Failed to save data to: ${fileName}\nReason: ${response}`)
        }
    }

    /**
     * Get data
     * @param {string} type The type: actor or user
     * @param {string} id   The actor or user id
     * @returns {object}    The data
     */
    static async getDataMigrate (type, id) {
        const folderPath = `${MODULE.ID}/${game.world.id}/${type}`
        const fileName = encodeURI(`${id}.json`)
        try {
            const foundFolderPath = await FilePicker.browse('data', folderPath)
            const foundFilePath = foundFolderPath.files.find(file => file.endsWith(fileName))
            if (foundFilePath) {
                const ms = Date.now()
                return await fetch(`${foundFilePath}?ms=${ms}`)
                    .then(response => {
                        if (response.ok) {
                            return response.json()
                        } else {
                            return null
                        }
                    })
                    .catch(error => {
                        console.error(error)
                    })
            } else {
                return null
            }
        } catch {
            return null
        }
    }
}
