const {
  isFunction,
  isObject,
  isPint,
  asyncGeneratorResult,
} = require("./utils")

function createStructure({ manager, deep, shadow }) {
  const instance = Object.create(structurePrototype)

  if (!isFunction(manager?.getCell))
    throw new Error("manager option is required")
  instance._manager = manager

  if (!isPint(deep) || !isPint(shadow))
    throw new Error("deep and shadow options must be positive integers")
  instance._deep = deep
  instance._shadow = shadow

  return instance
}

const structurePrototype = {
  get deep() {
    return this._deep
  },
  get shadow() {
    return this._shadow
  },

  getMaxFilling(deep) {
    if (isPint(deep)) {
      return this._shadow ** deep
    }
    return this._shadow ** this._deep
  },

  async look(options, callback) {
    if (!isObject(options))
      throw new Error("options parameter must be an object")
    if (!isFunction(callback))
      throw new Error("callback parameter must be a function")

    const { steps = null, getInitialRow, handleCell } = options

    let maxSteps = options.maxSteps
    if (maxSteps !== 0 && !isPint(maxSteps)) maxSteps = Infinity

    const fixedSteps = isPint(steps)

    if (!isFunction(getInitialRow))
      throw new Error("getInitialRow option must be a function")
    if (!isFunction(handleCell))
      throw new Error("handleCell option must be a function")

    let row = await getInitialRow(options)
    let currentStep = 0
    do {
      let stop = false
      await callback(row, currentStep, () => (stop = true))
      if (stop) break

      if (fixedSteps) {
        if (steps <= currentStep) break
      } else if (currentStep >= maxSteps) break

      let newRow = [],
        realLength = 0
      for (const cell of row) {
        if (cell) {
          const result = await handleCell(cell, options, newRow, currentStep)
          if (result) {
            newRow.push(...result.row)
            realLength += result.length
          }
        }
      }
      row = newRow

      if (!fixedSteps && realLength === 0) break

      ++currentStep
    } while (true)
  },

  async lookCellDown(options = {}, callback) {
    const manager = this._manager
    if (isFunction(options)) {
      callback = options
      options = {}
    }
    options.steps = options.deep || null
    options.maxSteps = options.maxDeep || Infinity
    options.getInitialRow = async ({
      fields,
      filter,
      userFilter,
      limit,
      userLimit,
      connection,
    }) => {
      if (!filter && !userFilter && !limit) limit = 1
      return await manager.getCell({
        fields,
        filter,
        userFilter,
        limit,
        userLimit,
        returnArray: true,
        connection,
      })
    }
    const a_cellId = manager.getAlias("matrix", "cellId"),
      a_id = manager.getAlias("matrix", "id"),
      shadow = this._shadow
    options.handleCell = async (
      cell,
      {
        fields,
        fixedStructure,
        connection,
        stepFilter = {},
        stepUserFilter,
        stepLimit,
        stepUserLimit,
      }
    ) => {
      let length = 0
      const cellId = cell[a_id]
      const row = await manager.getCell({
        fields,
        returnArray: true,
        filter: { ...stepFilter, [a_cellId]: cellId },
        userFilter: stepUserFilter,
        limit: stepLimit,
        userLimit: stepUserLimit,
        connection,
      })
      length += row.length
      if (fixedStructure) {
        const length = shadow - row.length
        if (length > 0)
          row.push(
            ...new Array(length).fill(null).map((_) => ({ [a_cellId]: cellId }))
          )
      }
      return { row, length }
    }
    return await this.look(options, callback)
  },

  async lookCellUp(options = {}, callback) {
    const manager = this._manager
    if (isFunction(options)) {
      callback = options
      options = {}
    }
    options.steps = options.shallow || null
    options.maxSteps = options.maxShallow || Infinity
    const a_cellId = manager.getAlias("matrix", "cellId"),
      a_id = manager.getAlias("matrix", "id")
    options.getInitialRow = async ({
      fields = [],
      filter,
      userFilter,
      limit,
      userLimit,
      connection,
    }) => {
      if (!filter && !userFilter && !limit) limit = 1
      return await manager.getCell({
        fields: [...fields, a_cellId],
        filter,
        userFilter,
        limit,
        userLimit,
        returnArray: true,
        connection,
      })
    }
    options.handleCell = async (
      _cell,
      {
        fields = [],
        uniqueId,
        connection,
        stepFilter = {},
        stepUserFilter,
        stepLimit,
        stepUserLimit,
      },
      newRow
    ) => {
      let length = 0,
        row = []
      const cell = await manager.getCell({
        fields: [...fields, a_cellId],
        returnArray: false,
        filter: { ...stepFilter, [a_id]: _cell[a_cellId] },
        userFilter: stepUserFilter,
        limit: stepLimit,
        userLimit: stepUserLimit,
        connection,
      })
      if (cell) {
        if (
          !uniqueId ||
          (uniqueId && newRow.every((c) => c[a_id] !== cell[a_id]))
        ) {
          ++length
          row = [cell]
        }
      }
      return { row, length }
    }
    return await this.look(options, callback)
  },

  async lookUserDown(options = {}, callback) {
    const manager = this._manager
    if (isFunction(options)) {
      callback = options
      options = {}
    }
    options.steps = options.deep || null
    options.maxSteps = options.maxDeep || Infinity
    const a_pid = manager.getAlias("user", "partnerId"),
      a_id = manager.getAlias("user", "id")
    options.getInitialRow = async ({
      fields = [],
      filter,
      cellFilter,
      limit,
      cellLimit,
      connection,
    }) => {
      if (!filter && !cellFilter && !limit) limit = 1
      return await manager.getUser({
        fields: [...fields, a_pid],
        filter,
        cellFilter,
        limit,
        cellLimit,
        returnArray: true,
        connection,
      })
    }
    options.handleCell = async (
      user,
      {
        fields = [],
        allowRecursive,
        connection,
        stepFilter = {},
        stepCellFilter,
        stepLimit,
        stepCellLimit,
      }
    ) => {
      const _filter = { ...stepFilter, [a_pid]: user[a_id] }
      if (!allowRecursive && user[a_id] === user[a_pid]) {
        _filter[a_id] = { $neq: user[a_id] }
      }
      const row = await manager.getUser({
        fields: [...fields, a_pid],
        returnArray: true,
        filter: _filter,
        connection,
        cellFilter: stepCellFilter,
        limit: stepLimit,
        cellLimit: stepCellLimit,
      })
      return { row, length: row.length }
    }
    return await this.look(options, callback)
  },

  async lookUserUp(options = {}, callback) {
    const manager = this._manager
    if (isFunction(options)) {
      callback = options
      options = {}
    }
    options.steps = options.shallow || null
    options.maxSteps = options.maxShallow || Infinity
    const a_pid = manager.getAlias("user", "partnerId"),
      a_id = manager.getAlias("user", "id")
    options.getInitialRow = async ({
      fields = [],
      filter,
      cellFilter,
      limit,
      cellLimit,
      connection,
    }) => {
      if (!filter && !cellFilter && !limit) limit = 1
      return await manager.getUser({
        fields: [...fields, a_pid],
        filter,
        cellFilter,
        limit,
        cellLimit,
        returnArray: true,
        connection,
      })
    }
    options.handleCell = async (
      user,
      {
        fields = [],
        allowRecursive,
        uniqueId,
        connection,
        stepFilter = {},
        stepCellFilter,
        stepLimit,
        stepCellLimit,
      },
      newRow
    ) => {
      let length = 0,
        row = []
      if (!allowRecursive && user[a_id] === user[a_pid]) {
        return { row, length }
      }
      const cell = await manager.getUser({
        fields: [...fields, a_pid],
        returnArray: false,
        filter: { ...stepFilter, [a_id]: user[a_pid] },
        cellFilter: stepCellFilter,
        limit: stepLimit,
        cellLimit: stepCellLimit,
        connection,
      })
      if (cell) {
        if (
          !uniqueId ||
          (uniqueId && newRow.every((c) => c[a_id] !== cell[a_id]))
        ) {
          length = 1
          row = [cell]
        }
      }
      return { row, length }
    }
    return await this.look(options, callback)
  },

  async getHead({ cellId, fields, connection }) {
    let head = null
    const headShallow = this._deep
    const manager = this._manager
    await this.lookCellUp(
      {
        filter: { [manager.getAlias("matrix", "id")]: cellId },
        fields,
        maxShallow: headShallow,
        connection,
      },
      ([cell], shallow, stop) => {
        if (!cell) return stop()
        if (headShallow === shallow) {
          head = cell
          return stop()
        }
      }
    )
    return head
  },

  async isUserBelowUser({
    userId,
    upperUserId,
    optimize = true,
    step = false,
    path = false,
    connection,
  }) {
    let result = { isBelow: false }
    if (path) {
      result.path = []
    }
    if (step) result.step = 0

    if (userId && upperUserId) {
      const isN = isPint(upperUserId),
        manager = this._manager,
        a_id = manager.getAlias("user", "id")
      await this.lookUserUp(
        {
          filter: { [a_id]: userId },
          limit: 1,
          allowRecursive: false,
          uniqueId: true,
          connection,
        },
        ([user], currentStep, stop) => {
          if (step) result.step = currentStep

          if (!user) {
            return stop()
          }

          let id = user[a_id]
          if (isN) {
            id = +id
            if (optimize)
              if (id < upperUserId) {
                return stop()
              }
          }

          if (path) result.path.push({ userId: id })

          if (id === upperUserId) {
            result.isBelow = true
            return stop()
          }
        }
      )
    }
    return result
  },

  async isUserBelowCell({
    userId,
    upperCellId,
    upperUserId,
    optimize = true,
    step = false,
    path = false,
    connection,
  }) {
    let result = { isBelow: false }
    if (step) result.step = 0
    if (path) result.path = []

    if (userId && (upperCellId || upperUserId)) {
      const isN = isPint(upperCellId || upperUserId),
        manager = this._manager,
        a_userId = manager.getAlias("matrix", "userId"),
        a_id = manager.getAlias("matrix", "id"),
        a_cellId = manager.getAlias("matrix", "cellId"),
        useUserId = !!upperUserId

      let minUpperUserCellId
      if (optimize && useUserId) {
        const lowerUserCells = await manager.getCell({
          filter: { [a_userId]: userId },
          returnArray: true,
          connection,
        })
        if (lowerUserCells.length === 0) return result
        const maxCellId = Math.max(...lowerUserCells.map((cell) => cell[a_id]))

        const upperUserCells = (
          await manager.getCell({
            filter: { [a_userId]: upperUserId, [a_id]: { $lte: maxCellId } },
            returnArray: true,
            connection,
          })
        ).map((cell) => cell[a_id])
        if (upperUserCells.length === 0) return result
        minUpperUserCellId = Math.min(...upperUserCells)
      }

      const upperId = upperCellId || upperUserId
      await this.lookCellUp(
        {
          filter: { [a_userId]: userId },
          fields: !path ? (!useUserId ? [] : [a_userId]) : [a_cellId, a_userId],
          uniqueId: true,
          connection,
        },
        (row, currentStep, stop) => {
          if (step) result.step = currentStep

          if (row.length === 0) {
            return stop()
          }

          let stopOptimize = optimize
          for (const [i, cell] of Object.entries(row)) {
            let id = useUserId ? cell[a_userId] : cell[a_id]
            if (isN) {
              id = +id
              if (optimize) {
                if (useUserId) {
                  const cellId = cell[a_id]
                  if (minUpperUserCellId > cellId) {
                    row[i] === null
                    stopOptimize = true
                    continue
                  }
                  stopOptimize = false
                } else {
                  if (id >= upperId) stopOptimize = false
                  else {
                    row[i] === null
                    stopOptimize = true
                    continue
                  }
                }
              }
            }
            if (id === upperId) {
              result.isBelow = true
              if (path) {
                let cellId = useUserId ? cell[a_id] : id
                const userId = cell[a_userId]
                let p = result.path

                for (let i = p.length - 1; i >= 0; --i) {
                  p[i] = p[i].find((cell) => {
                    if (cell[a_cellId] === cellId) {
                      cellId = cell[a_id]
                      return true
                    }
                    return false
                  })
                }

                p = result.path = p.map((cell) =>
                  cell
                    ? {
                        userId: cell[a_userId],
                        cellId: cell[a_id],
                      }
                    : null
                )

                p.push({ userId, cellId: cell[a_id] })
              }
              return stop()
            }
          }

          if (path) result.path.push(row)
          if (stopOptimize) {
            return stop()
          }
        }
      )
    }
    return result
  },

  async isCellBelowCell({
    cellId,
    upperCellId,
    optimize = true,
    step = false,
    path = false,
    connection,
  }) {
    let result = { isBelow: false }
    if (path) result.path = []
    if (step) result.step = 0

    if (cellId && upperCellId) {
      const isN = isPint(upperCellId),
        manager = this._manager,
        a_id = manager.getAlias("matrix", "id")

      await this.lookCellUp(
        {
          filter: { [a_id]: cellId },
          limit: 1,
          uniqueId: true,
          connection,
        },
        ([cell], currentStep, stop) => {
          if (step) result.step = currentStep

          if (!cell) return stop()

          let id = cell[a_id]
          if (isN) {
            id = +id
            if (optimize)
              if (id < upperCellId) {
                return stop()
              }
          }

          if (path) result.path.push({ cellId: cell[a_id] })

          if (id === upperCellId) {
            result.isBelow = true
            return stop()
          }
        }
      )
    }
    return result
  },

  async isCellBelowUser({
    cellId,
    upperUserId,
    optimize = true,
    step = false,
    path = false,
    connection,
  }) {
    let result = { isBelow: false }
    if (path) result.path = []
    if (step) result.step = 0

    if (cellId && upperUserId) {
      const isN = isPint(upperUserId),
        manager = this._manager,
        a_id = manager.getAlias("matrix", "id"),
        a_userId = manager.getAlias("matrix", "userId")

      let minUpperUserCellId
      if (optimize) {
        const upperUserCells = (
          await manager.getCell({
            filter: { [a_userId]: upperUserId, [a_id]: { $lte: cellId } },
            returnArray: true,
            connection,
          })
        ).map((cell) => cell[a_id])
        if (upperUserCells.length === 0) return result
        minUpperUserCellId = Math.min(...upperUserCells)
      }

      await this.lookCellUp(
        {
          filter: { [a_id]: cellId },
          fields: [a_userId],
          limit: 1,
          uniqueId: true,
          connection,
        },
        ([cell], currentStep, stop) => {
          if (step) result.step = currentStep

          if (!cell) return stop()

          let id = cell[a_userId]
          if (isN) {
            id = +id
            if (optimize) {
              const cellId = cell[a_id]
              if (minUpperUserCellId > cellId) {
                return stop()
              }
            }
          }

          if (path)
            result.path.push({ cellId: cell[a_id], userId: cell[a_userId] })

          if (id === upperUserId) {
            result.isBelow = true
            return stop()
          }
        }
      )
    }
    return result
  },

  async isUserBelowUserCell({
    userId,
    upperUserId,
    optimize = true,
    step = false,
    path = false,
    connection,
  }) {
    return await this.isUserBelowCell({
      userId,
      upperUserId,
      optimize,
      step,
      path,
      connection,
    })
  },

  async find(options, callback, searcher) {
    if (isFunction(options)) {
      searcher = callback
      callback = options
      options = {}
    }
    searcher = searcher || this.look.bind(this)
    let result = null

    await searcher(options, async (row, step, stop) => {
      await callback(
        row,
        step,
        (r) => {
          result = r
          stop()
        },
        stop
      )
    })
    return result
  },

  async findCellDown(options = {}, callback) {
    return await this.find(options, callback, this.lookCellDown.bind(this))
  },
  async findCellUp(options = {}, callback) {
    return await this.find(options, callback, this.lookCellUp.bind(this))
  },
  async findUserDown(options = {}, callback) {
    return await this.find(options, callback, this.lookUserDown.bind(this))
  },
  async findUserUp(options = {}, callback) {
    return await this.find(options, callback, this.lookUserUp.bind(this))
  },

  async findGenerator(options, generatorFunction, searcher) {
    if (isFunction(options)) {
      searcher = callback
      callback = options
      options = {}
    }
    if (
      !isFunction(generatorFunction) ||
      !["[object Generator]", "[object AsyncGenerator]"].includes(
        generatorFunction.prototype.toString()
      )
    )
      throw new Error("generatorFunction is not a generator")

    searcher = searcher || this.find.bind(this)
    return await searcher(options, async (row, step, result, stop) => {
      const r = await asyncGeneratorResult({
        generatorFunction,
        generatorArguments: [row, step, result, stop],
      })
      if (r) result(r)
    })
  },

  async findCellDownGenerator(options = {}, callback) {
    return await this.findGenerator(
      options,
      callback,
      this.findCellDown.bind(this)
    )
  },
  async findCellUpGenerator(options = {}, callback) {
    return await this.findGenerator(
      options,
      callback,
      this.findCellUp.bind(this)
    )
  },
  async findUserDownGenerator(options = {}, callback) {
    return await this.findGenerator(
      options,
      callback,
      this.findUserDown.bind(this)
    )
  },
  async findUserUpGenerator(options = {}, callback) {
    return await this.findGenerator(
      options,
      callback,
      this.findUserUp.bind(this)
    )
  },

  async getFirstUnfilledCell({
    filter,
    fields = [],
    limit,
    userFilter,
    userLimit,
    stepFilter,
    stepLimit,
    stepUserFilter,
    stepUserLimit,
    maxDeep = Infinity,
    connection,
    checkCell,
  }) {
    const manager = this._manager,
      a_filled = manager.getAlias("matrix", "filled"),
      shadow = this._shadow
    return await this.findCellDown(
      {
        filter,
        fields: [...fields, a_filled],
        userFilter,
        userLimit,
        limit,
        stepFilter,
        stepLimit,
        stepUserFilter,
        stepUserLimit,
        maxDeep,
        connection,
      },
      async (row, step, result) => {
        for (const cell of row) {
          if (cell?.[a_filled] >= shadow) return
          if (checkCell) {
            if (!(await checkCell(cell, step))) return
          }
          return result(cell)
        }
      }
    )
  },

  async getUserUnfilledCell({
    filter = {},
    fields,
    userFilter,
    userLimit,
    stepFilter,
    stepLimit,
    stepUserFilter,
    stepUserLimit,
    checkCell,
    connection,
  }) {
    const manager = this._manager
    return await this.getFirstUnfilledCell({
      filter: {
        ...filter,
        [manager.getAlias("matrix", "headFilled")]: {
          $lt: this.getMaxFilling(),
        },
      },
      fields,
      limit: 1,
      userFilter,
      userLimit,
      stepFilter,
      stepLimit,
      stepUserFilter,
      stepUserLimit,
      maxDeep: this._deep - 1,
      checkCell,
      connection,
    })
  },

  async getRow({
    filter,
    limit,
    userFilter,
    userLimit,
    fields,
    deep = this._deep,
    fixedStructure = true,
    connection,
  }) {
    return await this.findCellDown(
      {
        filter,
        limit,
        userFilter,
        userLimit,
        fields,
        fixedStructure,
        deep,
        connection,
      },
      (row, step, result) => {
        if (step === deep) result(row)
      }
    )
  },
}

module.exports = createStructure
