import { MODULE } from './constants.js'
import { Logger, Utils } from './utils.js'

/**
 * Get file parts
 * @param {string} file The file
 * @returns {object}    The file parts
 */
function getFileParts (file) {
    const parts = file.split('/')
    const filename = parts.pop()
    const folder = parts.join('/')
    const id = filename.split('.')[0]
    return { folder, filename, id }
}

export function isPersistentStorage () {
    return (game.version >= '11.305' && typeof ForgeVTT === 'undefined')
}

export class DataHandler {
    async init () {
        this.path = DataHandler.getPath()
        this.private = await DataHandler.isPrivate()
        this.fileMap = await DataHandler.getFilePathsAsGm()
    }

    /**
     * Create directories
     */
    static async createDirectories () {
        const DATA_FOLDER = 'data'
        const moduleDirectory = (isPersistentStorage())
            ? `modules/${MODULE.ID}/storage`
            : MODULE.ID

        const directoriesToCreate = [
            moduleDirectory,
            `${moduleDirectory}/${game.world.id}`,
            `${moduleDirectory}/${game.world.id}/actor`,
            `${moduleDirectory}/${game.world.id}/user`
        ]

        for (const directory of directoriesToCreate) {
            await FilePicker.browse(DATA_FOLDER, directory).catch(async (_) => {
                if (!(await FilePicker.createDirectory(DATA_FOLDER, directory, {}))) {
                    Logger.debug('Failed to create directory: ' + directory)
                }
            })
        }
    }

    /**
     * Get base path to the layout files
     * @returns {string} The path
     */
    static getPath () {
        return (isPersistentStorage())
            ? `modules/${MODULE.ID}/storage/${game.world.id}/`
            : `${MODULE.ID}/${game.world.id}/`
    }

    /**
     * Whether the module directory is set to private
     * @returns {boolean} Whether the module directory is set to private
     */
    static async isPrivate () {
        if (game.user.isGM) return false

        const dataHandler = game?.tokenActionHud?.dataHandler

        if (game.user.hasPermission('FILES_BROWSE')) {
            try {
                await FilePicker.browse('data', dataHandler.path)
                return false
            } catch {
                return true
            }
        }
    }

    /**
     * Get file paths as GM
     * @returns {object} The file paths
     */
    static async getFilePathsAsGm () {
        const dataHandler = game.tokenActionHud.dataHandler

        if ((!game.user.hasPermission('FILES_BROWSE') || dataHandler.private) && !Utils.isGmActive()) {
            Logger.info('Cannot get file paths without a GM present', true)
            return new Map() // Return an empty map if no permissions and no GM
        }

        const files = game.user.hasPermission('FILES_BROWSE') && !dataHandler.private
            ? await DataHandler.getFilePaths()
            : await game.tokenActionHud.socket.executeAsGM('getFilePaths')

        return new Map(files.map(file => {
            const { id } = getFileParts(file)
            return [id, file]
        }))
    }

    /**
     * Get file paths
     */
    static async getFilePaths () {
        const dataHandler = game?.tokenActionHud?.dataHandler
        const [actorFiles, userFiles] = await Promise.all([
            FilePicker.browse('data', `${dataHandler.path}actor/`),
            FilePicker.browse('data', `${dataHandler.path}user/`)
        ])

        return [...(actorFiles?.files ?? []), ...(userFiles?.files ?? [])]
    }

    /**
     * Whether the user can save data
     * @returns {boolean} Whether the user can save data
     */
    static canSaveData () {
        const dataHandler = game.tokenActionHud.dataHandler

        return ((game.user.hasPermission('FILES_UPLOAD') && !dataHandler.private) || Utils.isGmActive())
    }

    /**
     * Save data the GM
     * @public
     * @param {string} type The type: actor or user
     * @param {string} id   The actor or user id
     * @param {object} data The data
     */
    static async saveDataAsGm (type, id, data) {
        const dataHandler = game.tokenActionHud.dataHandler

        if (game.user.hasPermission('FILES_UPLOAD') && !dataHandler.private) {
            return await DataHandler.saveData(type, id, data)
        }

        if (!Utils.isGmActive()) {
            Logger.info('Cannot save data without a GM present', true)
            return
        }

        await game.tokenActionHud.socket.executeAsGM('saveData', type, id, data)
    }

    /**
     * Save data
     * @param {string} type The type: actor or user
     * @param {string} id   The actor or user id
     * @param {object} data The data
     */
    static async saveData (type, id, data) {
        const dataHandler = game?.tokenActionHud?.dataHandler

        try {
            // Get the folder path
            const folder = `${dataHandler.path}${type}`

            // Generate the system-safe filename
            const fileName = encodeURI(`${id}.json`)

            // Create the file and contents
            const file = new File([JSON.stringify(data, null, '')], fileName, { type: 'application/json' })

            // Upload the file
            const response = await FilePicker.upload('data', folder, file, {}, { notify: false })

            if (response.path) {
                if (!dataHandler.fileMap.has(id)) {
                    dataHandler.fileMap.set(id, response.path)
                }
            } else {
                Logger.debug(`Failed to save data to: ${fileName}\nReason: ${response.error || 'Unknown error'}`)
            }
        } catch (error) {
            Logger.error(`An error occurred while saving data for ${id}.json: ${error.message}`)
        }
    }

    /**
     * Whether the user can get data
     * @returns {boolean} Whether the user can get data
     */
    static canGetData () {
        const dataHandler = game.tokenActionHud.dataHandler

        return ((game.user.hasPermission('FILES_BROWSE') && !dataHandler.private) || Utils.isGmActive())
    }

    /**
     * Get data as GM
     * @public
     * @param {object} options The options: file, type, id
     * @returns {object}       The data
     */
    static async getDataAsGm (options) {
        const dataHandler = game.tokenActionHud.dataHandler

        try {
            if ((!game.user.hasPermission('FILES_BROWSE') || dataHandler.private) && !Utils.isGmActive()) {
                Logger.info('Cannot get data without a GM present', true)
                return
            }

            return (game.user.hasPermission('FILES_BROWSE'))
                ? await DataHandler.getData(options)
                : await game.tokenActionHud.socket.executeAsGM('getData', options)
        } catch (error) {
            Logger.error(`An error occurred while getting data: ${error.message}`)
            return null
        }
    }

    /**
     * Get data
     * @param {string} options The options: file, type, id
     * @returns {object}       The data
     */
    static async getData (options) {
        const dataHandler = game.tokenActionHud.dataHandler

        const { id, file } = options

        // Check if the file is available in the fileMap
        let foundFile = dataHandler.fileMap.get(id) ?? null

        // If not found, try to browse, otherwise return null
        if (!foundFile) {
            if (!file) return null
            const { folder, filename } = getFileParts(file)
            const foundFolder = await FilePicker.browse('data', folder)
            foundFile = foundFolder.files.find(file => file.endsWith(filename))
            if (!foundFile) return null
        }

        try {
            const ms = Date.now()
            const response = await fetch(`${foundFile}?ms=${ms}`)

            // Check if the fetch was successful
            if (response.ok) {
                return await response.json()
            } else {
                return null
            }
        } catch (error) {
            console.error(error)
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
