const { isObject, isFunction, merge } = require("./utils")
const { createPoolConnector } = require("dbriver")

const defaultSchema = {
  matrix: {
    collation: "matrix",
    fields: {
      id: "id",
      userId: "userId",
      cellId: "cellId",
      filled: "filled",
      headFilled: "headFilled",
    },
  },
  user: {
    collation: "user",
    fields: {
      id: "id",
      partnerId: "partnerId",
    },
  },
}

function createDbriverManager(options) {
  const instance = Object.create(dbriverManagerPrototype)

  if (!isObject(options)) throw new Error("Options must be an object")

  if (isObject(options.poolConfig))
    instance._pool = createPoolConnector(options.poolConfig)
  else if (isFunction(options.pool?.getConnection))
    instance._pool = options.pool
  else throw new Error("poolConfig or pool option is required")

  instance._schema = merge(defaultSchema, options.schema || {})

  return instance
}

const dbriverManagerPrototype = {
  getAlias(collation, field) {
    if (collation) {
      if (field !== undefined) {
        return this._schema[collation]?.fields?.[field] || null
      }
      return this._schema[collation]?.collation || null
    }
    return null
  },

  async openConnection(options = {}) {
    const { transaction = false } = options

    const connection = await this._pool.getConnection()
    connection._useTransaction = false
    connection._needRollback = false
    if (transaction) {
      await connection.startTransaction()
      connection._useTransaction = true
    }
    return connection
  },
  async closeConnection(connection) {
    if (connection) {
      try {
        if (connection._useTransaction) {
          if (connection._needRollback) {
            await connection.rollback()
          } else {
            await connection.commit()
          }
        }
      } catch (err) {
        throw err
      } finally {
        connection.destroy()
      }
    }
  },

  async getCell(options = {}) {
    let {
      filter,
      userFilter,
      fields = [],
      returnArray = true,
      limit = null,
      userLimit = null,
      connection = null,
    } = options

    if (!connection) throw new Error("connection option is required")

    const necessaryFields = [this.getAlias("matrix", "id")]
    fields = [...new Set([...necessaryFields, ...fields])]

    const query = connection
      .select(...fields)
      .from(this.getAlias("matrix"))
      .orderBy({ id: "asc" })

    if (connection._useTransaction) query.lockFor({ mode: "update" })

    if (filter) query.where(filter)
    if (userFilter) {
      const subQuery = connection
        .select(this.getAlias("user", "id"))
        .from(this.getAlias("user"))
        .where(userFilter)
        .orderBy({ id: "asc" })
      if (userLimit) subQuery.limit(userLimit)
      if (connection._useTransaction) subQuery.lockFor({ mode: "update" })
      query.where({
        [this.getAlias("matrix", "userId")]: {
          $in: subQuery,
        },
      })
    }
    if (limit) query.limit(limit)
    if (!returnArray) query.limit(1)

    return (await query.fetch({ one: !returnArray })) || null
  },

  async getUser(options = {}) {
    let {
      filter,
      cellFilter,
      fields = [],
      returnArray = true,
      limit = null,
      cellLimit = null,
      connection = null,
    } = options

    if (!connection) throw new Error("connection option is required")

    const userIdField = this.getAlias("user", "id")
    const necessaryFields = [userIdField]
    fields = [...new Set([...necessaryFields, ...fields])]

    const query = connection
      .select(...fields)
      .from(this.getAlias("user"))
      .orderBy({ id: "asc" })

    if (connection._useTransaction) query.lockFor({ mode: "update" })

    if (filter) query.where(filter)
    if (cellFilter) {
      const subQuery = connection
        .select(this.getAlias("matrix", "userId"))
        .from(this.getAlias("matrix"))
        .where(cellFilter)
        .orderBy({ id: "asc" })
      if (cellLimit) subQuery.limit(cellLimit)
      if (connection._useTransaction) subQuery.lockFor({ mode: "update" })
      query.where({
        [userIdField]: {
          $in: subQuery,
        },
      })
    }

    if (limit) query.limit(limit)
    if (!returnArray) query.limit(1)

    return (await query.fetch({ one: !returnArray })) || null
  },

  async insertCell({ cell, connection = null }) {
    if (!connection) throw new Error("connection option is required")

    if (!isObject(cell)) throw new Error("cell parameter must be an object")

    const cellId = cell[this.getAlias("matrix", "cellId")]
    if (cellId !== null && !cellId) throw new Error("cellId is required field")

    const userId = cell[this.getAlias("matrix", "userId")]
    if (userId !== null && !userId) throw new Error("userId is required field")

    const { insertId } = await connection
      .insert(cell)
      .into(this.getAlias("matrix"))
      .fetch()

    return { ...cell, [this.getAlias("matrix", "id")]: insertId }
  },

  async increaseFilling({
    connection = null,
    cellId,
    field = this.getAlias("matrix", "filled"),
  }) {
    if (!connection) throw new Error("connection option is required")
    if (!cellId) throw new Error("cellId option is required")
    if (!field) throw new Error("field option is required")

    const { changedRows } = await connection
      .update(this.getAlias("matrix"))
      .set({ [field]: { $: `${connection.escapeId(field)} + 1` } })
      .where({ [this.getAlias("matrix", "id")]: cellId })
      .fetch()

    return !!changedRows && changedRows > 0
  },
}

module.exports = createDbriverManager
