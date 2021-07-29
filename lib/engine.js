const { isFunction, asyncGeneratorResult, isObject, has } = require("./utils")

function createEngine({
  structure,
  defaultCellValues,
  engine,
  engineGenerator,
}) {
  const instance = Object.create(enginePrototype)

  if (!isFunction(structure?.look))
    throw new Error("structure options is required")
  instance._structure = structure

  if (isFunction(engine)) instance._engine = engine
  else if (
    isFunction(engineGenerator) &&
    ["[object Generator]", "[object AsyncGenerator]"].includes(
      engineGenerator.prototype.toString()
    )
  )
    instance._engine = async (...args) =>
      await asyncGeneratorResult({
        generatorFunction: engineGenerator,
        generatorArguments: args,
      })
  else throw new Error("engine or engineGenerator option is required")

  instance._defaultCellValues = defaultCellValues || {}

  return instance
}

const enginePrototype = {
  async createCell(options = {}) {
    let { cellValues, search = true, connection } = options
    const manager = this._structure._manager
    if (!isObject(cellValues))
      throw new Error("cellValues option is not an object")
    if (!has(cellValues, manager.getAlias("matrix", "userId")))
      throw new Error("cellValues.userId is required option")

    cellValues = {
      ...this._defaultCellValues,
      ...cellValues,
    }

    let searchMeta = null
    if (search) {
      const place = await this.search(cellValues, connection)
      if (!place) throw new Error("place not found")
      cellValues[manager.getAlias("matrix", "cellId")] = place.cellId
      searchMeta = place.meta
    } else if (!has(cellValues, manager.getAlias("matrix", "cellId")))
      throw new Error("cellValues.cellId is required option")

    return {
      cellValues,
      searchMeta,
    }
  },
  async search(cellValues, connection) {
    const structure = this._structure,
      manager = structure._manager
    const place = await this._engine({
      cellValues,
      engine: this,
      structure,
      manager,
      connection,
    })
    if (isObject(place) && has(place, "cellId")) return place
    return null
  },
  async place(cell, meta = null) {
    if (!cell) return null
    if (cell.then && !(cell = await cell)) return null

    const manager = this._structure._manager,
      a_id = manager.getAlias("matrix", "id")
    if (isObject(cell)) {
      if (cell[a_id]) return { cellId: cell[a_id], meta }
      else return null
    }
    return { cellId: cell, meta }
  },
}

module.exports = createEngine
