export class ActionCategory {
    constructor (id = '', name = '') {
        this.id = id
        this.nestId = id
        this.name = name
        this.level = 'category'
        this.cssClass = ''
        this.subcategories = []
    }
}
