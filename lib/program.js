const { isFunction } = require("./utils")

function createProgram({
  engine,
  beforeCreateCell = null,
  beforeInsertCell = null,
  afterInsertCell = null,
  afterCellsUpdate = null,
}) {
  const instance = Object.create(programPrototype)

  if (!isFunction(engine?.createCell))
    throw new Error("engine option is required")
  instance._engine = engine

  instance.beforeCreateCell = beforeCreateCell
  instance.beforeInsertCell = beforeInsertCell
  instance.afterInsertCell = afterInsertCell
  instance.afterCellsUpdate = afterCellsUpdate

  return instance
}

const programPrototype = {
  async insertCell({ useConnection = null, cellOptions = {}, cellMeta }) {
    const engine = this._engine,
      structure = engine._structure,
      manager = structure._manager,
      beforeCreateCell = this.beforeCreateCell,
      beforeInsertCell = this.beforeInsertCell,
      afterInsertCell = this.afterInsertCell,
      afterCellsUpdate = this.afterCellsUpdate,
      anotherConnection = !!useConnection

    const connection = anotherConnection
      ? useConnection
      : await manager.openConnection({ transaction: true })
    try {
      if (beforeCreateCell) {
        await beforeCreateCell({
          program: this,
          engine,
          manager,
          structure,
          cellOptions,
          connection,
          cellMeta,
        })
      }
      const cell = await engine.createCell({ ...cellOptions, connection })

      const a_cellId = manager.getAlias("matrix", "cellId"),
        upperCellId = cell.cellValues[a_cellId],
        a_id = manager.getAlias("matrix", "id")

      if (upperCellId !== null) {
        const a_filled = manager.getAlias("matrix", "filled")

        const upperCell = await manager.getCell({
          fields: [a_filled],
          filter: { id: upperCellId },
          returnArray: false,
          connection,
        })
        if (!upperCell || upperCell[a_filled] >= structure.shadow)
          throw new Error("place does not exist or is already filled")
      }

      if (beforeInsertCell) {
        await beforeInsertCell({
          program: this,
          engine,
          manager,
          structure,
          cell,
          connection,
          cellMeta,
        })
      }

      cell.cellValues = await manager.insertCell({
        cell: cell.cellValues,
        connection,
      })
      if (!cell.cellValues[a_id]) throw new Error("cell is not insert")

      if (afterInsertCell) {
        await afterInsertCell({
          program: this,
          engine,
          manager,
          structure,
          cell,
          connection,
          cellMeta,
        })
      }

      if (upperCellId)
        await manager.increaseFilling({
          cellId: upperCellId,
          connection,
        })

      const head = await structure.getHead({
        cellId: cell.cellValues[a_id],
        connection,
      })
      if (head)
        await manager.increaseFilling({
          cellId: head[a_id],
          field: manager.getAlias("matrix", "headFilled"),
          connection,
        })

      if (afterCellsUpdate) {
        await afterCellsUpdate({
          program: this,
          engine,
          manager,
          structure,
          cell,
          head,
          connection,
          cellMeta,
        })
      }

      return cell
    } catch (error) {
      connection._needRollback = true
      throw error
    } finally {
      if (!anotherConnection) await manager.closeConnection(connection)
    }
  },
}

module.exports = createProgram
