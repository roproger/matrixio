import { createPoolConnector } from "dbriver"

declare type ConstantStringOrDefault<T, K = ""> = string extends T ? K : T

declare type DbriverPoolConfig = typeof createPoolConnector extends (
  options: infer T
) => any
  ? T
  : never

declare type DbriverPoolInstance = typeof createPoolConnector extends (
  ...args: any
) => infer T
  ? T
  : never

declare type DefaultSchema = {
  matrix: {
    collation: "matrix"
    fields: {
      id: "id"
      userId: "userId"
      cellId: "cellId"
      filled: "filled"
      headFilled: "headFilled"
    }
  }
  user: {
    collation: "user"
    fields: {
      id: "id"
      partnerId: "partnerId"
    }
  }
}

declare type Connection = ReturnType<
  DbriverPoolInstance["getConnection"]
> extends Promise<infer T>
  ? T
  : never

declare type Cell<T extends string> = { [key in T]: any }

declare type CellResult<T> = null | (Cell<T> & Array<Cell<T>>)

declare interface ManagerInstance<
  MatrixCollation,
  MatrixKeys,
  MatrixId,
  UserCollation,
  UserKeys,
  UserId
> {
  getAlias: <T extends keyof DefaultSchema>(
    collation: T,
    field?: keyof DefaultSchema[T]["fields"]
  ) => string | null
  openConnection: (options?: { transaction?: boolean }) => Promise<Connection>
  closeConnection: (connection: Connection) => Promise<void>
  getCell: <T extends string>(options: {
    connection: Connection
    fields?: T[] | MatrixKeys[]
    filter?: {
      [key in MatrixKeys | ConstantStringOrDefault<T>]: any
    }
    userFilter?: {
      [key in UserKeys]: any
    }
    returnArray?: boolean
    limit?: number
    userLimit?: number
  }) => Promise<CellResult<ConstantStringOrDefault<T> | MatrixId>>
  getUser: <T extends string>(options: {
    connection: Connection
    fields?: T[] | UserKeys[]
    filter?: {
      [key in UserKeys | ConstantStringOrDefault<T>]: any
    }
    cellFilter?: {
      [key in MatrixKeys]: any
    }
    returnArray?: boolean
    limit?: number
    cellLimit?: number
  }) => Promise<CellResult<ConstantStringOrDefault<T> | UserId>>
  insertCell: <T extends string>(options: {
    connection: Connection
    cell: {
      [key in T]: any
    } &
      { [key in MatrixKeys]: any }
  }) => Promise<{ [key in T | MatrixId]: any }>
  increaseFilling: (options: {
    cellId: any
    field: MatrixKeys
    connection: Connection
  }) => Promise<boolean>
}

declare type CreateDbriverManager = <
  MatrixCollation extends string,
  MatrixKeys extends string,
  MatrixId extends string,
  UserCollation extends string,
  UserKeys extends string,
  UserId extends string,
  T extends string,
  K extends string
>(options: {
  schema?: {
    matrix?: {
      collation?: MatrixCollation
      fields?: {
        id?: MatrixId
      } & { [key in T | keyof DefaultSchema["matrix"]["fields"]]: MatrixKeys }
    }
    user?: {
      collation?: UserCollation
      fields?: {
        id?: UserId
      } & { [key in K | keyof DefaultSchema["user"]["fields"]]: UserKeys }
    }
  }
  poolConfig?: DbriverPoolConfig
  pool?: DbriverPoolInstance
}) => ManagerInstance<
  ConstantStringOrDefault<
    MatrixCollation,
    DefaultSchema["matrix"]["collation"]
  >,
  | ConstantStringOrDefault<MatrixKeys, "">
  | Exclude<
      keyof DefaultSchema["matrix"]["fields"],
      ConstantStringOrDefault<T, "">
    >,
  ConstantStringOrDefault<MatrixId, DefaultSchema["matrix"]["fields"]["id"]>,
  ConstantStringOrDefault<UserCollation, DefaultSchema["user"]["collation"]>,
  | ConstantStringOrDefault<UserKeys>
  | Exclude<
      keyof DefaultSchema["user"]["fields"],
      ConstantStringOrDefault<K, "">
    >,
  ConstantStringOrDefault<UserId, DefaultSchema["user"]["fields"]["id"]>
>

declare type LookCallback<T extends { [key: string]: any }> = (
  row: Array<T>,
  currentStep: number,
  stop: () => void
) => any

declare type PromiseOrValue<T> = T & Promise<T>

declare interface StructureInstance<
  MatrixCollation,
  MatrixKeys,
  MatrixId,
  UserCollation,
  UserKeys,
  UserId
> {
  readonly deep: number
  readonly shadow: number
  getMaxFilling: (deep?: number) => number
  look: (
    options: {
      steps?: number
      maxSteps?: number
      getInitialRow: (options: object) => PromiseOrValue<object[]>
      handleCell: (
        cell: object,
        options: object,
        newRow: object[],
        previousStep: number
      ) => PromiseOrValue<{ length: number; row: object[] }>
    },
    callback: LookCallback<object>
  ) => Promise<void>
  lookCellDown<T extends string>(
    options?: {
      connection: Connection
      deep?: number
      maxDeep?: number
      fields?: T[] | MatrixKeys[]
      filter?: {
        [key in MatrixKeys | ConstantStringOrDefault<T>]: any
      }
      userFilter?: { [key in UserKeys]: any }
      limit?: number
      userLimit?: number
      stepFilter?: {
        [key in MatrixKeys | ConstantStringOrDefault<T>]: any
      }
      stepUserFilter?: { [key in UserKeys]: any }
      stepLimit?: number
      stepUserLimit?: number
      fixedStructure?: boolean
    },
    callback: LookCallback<
      { [key in ConstantStringOrDefault<T, ""> | MatrixId]: any }
    >
  ): Promise<void>
  lookCellDown(
    callback: LookCallback<{ [key in MatrixId]: any }>
  ): Promise<void>
  lookCellUp<T extends string>(
    options?: {
      connection: Connection
      shallow?: number
      maxShallow?: number
      fields?: T[] | MatrixKeys[]
      filter?: {
        [key in MatrixKeys | ConstantStringOrDefault<T>]: any
      }
      userFilter?: { [key in UserKeys]: any }
      limit?: number
      userLimit?: number
      stepFilter?: {
        [key in MatrixKeys | ConstantStringOrDefault<T>]: any
      }
      stepUserFilter?: { [key in UserKeys]: any }
      stepLimit?: number
      stepUserLimit?: number
      uniqueId?: boolean
    },
    callback: LookCallback<
      { [key in ConstantStringOrDefault<T, ""> | MatrixId]: any }
    >
  ): Promise<void>
  lookCellUp(callback: LookCallback<{ [key in MatrixId]: any }>): Promise<void>
  lookUserDown<T extends string>(
    options?: {
      connection: Connection
      deep?: number
      maxDeep?: number
      fields?: T[] | UserKeys[]
      filter?: {
        [key in UserKeys | ConstantStringOrDefault<T>]: any
      }
      cellFilter?: { [key in MatrixKeys]: any }
      limit?: number
      cellLimit?: number
      stepFilter?: {
        [key in UserKeys | ConstantStringOrDefault<T>]: any
      }
      stepCellFilter?: { [key in MatrixKeys]: any }
      stepLimit?: number
      stepCellLimit?: number
      allowRecursive?: boolean
    },
    callback: LookCallback<
      { [key in ConstantStringOrDefault<T, ""> | UserId]: any }
    >
  ): Promise<void>
  lookUserDown(callback: LookCallback<{ [key in UserId]: any }>): Promise<void>
  lookUserUp<T extends string>(
    options?: {
      connection: Connection
      shallow?: number
      maxShallow?: number
      fields?: T[] | UserKeys[]
      filter?: {
        [key in UserKeys | ConstantStringOrDefault<T>]: any
      }
      cellFilter?: { [key in MatrixKeys]: any }
      limit?: number
      cellLimit?: number
      stepFilter?: {
        [key in UserKeys | ConstantStringOrDefault<T>]: any
      }
      stepCellFilter?: { [key in MatrixKeys]: any }
      stepLimit?: number
      stepCellLimit?: number
      allowRecursive?: boolean
      uniqueId?: boolean
    },
    callback: LookCallback<
      { [key in ConstantStringOrDefault<T, ""> | UserId]: any }
    >
  ): Promise<void>
  lookUserUp(callback: LookCallback<{ [key in UserId]: any }>): Promise<void>
  getHead: <T extends string>(options: {
    cellId: any
    fields?: T[] | MatrixKeys[]
    connection: Connection
  }) => Promise<
    null | { [key in ConstantStringOrDefault<T, ""> | MatrixId]: any }
  >
  isUserBelowUser: <T extends any, K extends any>(options: {
    userId: any
    upperUserId: any
    optimize?: boolean
    connection: Connection
    step?: T
    path?: K
  }) => Promise<IsBelowType<T, K, { userId: any }>>
  isUserBelowCell: <T extends any, K extends any>(options: {
    userId: any
    upperCellId?: any
    upperUserId?: any
    optimize?: boolean
    connection: Connection
    step?: T
    path?: K
  }) => Promise<IsBelowType<T, K, { userId: any; cellId: any }>>
  isCellBelowCell: <T extends any, K extends any>(options: {
    cellId: any
    upperCellId: any
    optimize?: boolean
    connection: Connection
    step?: T
    path?: K
  }) => Promise<IsBelowType<T, K, { cellId: any }>>
  isCellBelowUser: <T extends any, K extends any>(options: {
    cellId: any
    upperUserId: any
    optimize?: boolean
    connection: Connection
    step?: T
    path?: K
  }) => Promise<IsBelowType<T, K, { cellId: any; userId: any }>>
  isUserBelowUserCell: <T extends any, K extends any>(options: {
    userId: any
    upperUserId: any
    optimize?: boolean
    connection: Connection
    step?: T
    path?: K
  }) => Promise<IsBelowType<T, K, { userId: any; cellId: any }>>
  find<T extends object>(
    options: T,
    callback: FindCallback<{ [key in MatrixKeys]: any }>,
    searcher?: (
      options: T,
      callback: LookCallback<{ [key in MatrixKeys]: any }>
    ) => any
  ): Promise<any>
  find(
    callback: FindCallback<{ [key in MatrixKeys]: any }>,
    searcher?: (
      options: object,
      callback: LookCallback<{ [key in MatrixKeys]: any }>
    ) => any
  ): Promise<any>
  findCellDown<T extends string>(
    options?: {
      connection: Connection
      deep?: number
      maxDeep?: number
      fields?: T[] | MatrixKeys[]
      filter?: {
        [key in MatrixKeys | ConstantStringOrDefault<T>]: any
      }
      userFilter?: { [key in UserKeys]: any }
      limit?: number
      userLimit?: number
      stepFilter?: {
        [key in MatrixKeys | ConstantStringOrDefault<T>]: any
      }
      stepUserFilter?: { [key in UserKeys]: any }
      stepLimit?: number
      stepUserLimit?: number
      fixedStructure?: boolean
    },
    callback: FindCallback<
      { [key in ConstantStringOrDefault<T> | MatrixId]: any }
    >
  ): Promise<any>
  findCellDown(callback: FindCallback<{ [key in MatrixId]: any }>): Promise<any>
  findCellUp<T extends string>(
    options?: {
      connection: Connection
      shallow?: number
      maxShallow?: number
      fields?: T[] | MatrixKeys[]
      filter?: {
        [key in MatrixKeys | ConstantStringOrDefault<T>]: any
      }
      userFilter?: { [key in UserKeys]: any }
      limit?: number
      userLimit?: number
      stepFilter?: {
        [key in MatrixKeys | ConstantStringOrDefault<T>]: any
      }
      stepUserFilter?: { [key in UserKeys]: any }
      stepLimit?: number
      stepUserLimit?: number
      uniqueId?: boolean
    },
    callback: FindCallback<
      { [key in ConstantStringOrDefault<T> | MatrixId]: any }
    >
  ): Promise<any>
  findCellUp(callback: FindCallback<{ [key in MatrixId]: any }>): Promise<any>
  findUserDown<T extends string>(
    options?: {
      connection: Connection
      deep?: number
      maxDeep?: number
      fields?: T[] | UserKeys[]
      filter?: {
        [key in UserKeys | ConstantStringOrDefault<T>]: any
      }
      cellFilter?: { [key in MatrixKeys]: any }
      limit?: number
      cellLimit?: number
      stepFilter?: {
        [key in UserKeys | ConstantStringOrDefault<T>]: any
      }
      stepCellFilter?: { [key in MatrixKeys]: any }
      stepLimit?: number
      stepCellLimit?: number
      allowRecursive?: boolean
    },
    callback: FindCallback<
      { [key in ConstantStringOrDefault<T> | UserId]: any }
    >
  ): Promise<any>
  findUserDown(callback: FindCallback<{ [key in UserId]: any }>): Promise<any>
  findUserUp<T extends string>(
    options?: {
      connection: Connection
      shallow?: number
      maxShallow?: number
      fields?: T[] | UserKeys[]
      filter?: {
        [key in UserKeys | ConstantStringOrDefault<T>]: any
      }
      cellFilter?: { [key in MatrixKeys]: any }
      limit?: number
      cellLimit?: number
      stepFilter?: {
        [key in UserKeys | ConstantStringOrDefault<T>]: any
      }
      stepCellFilter?: { [key in MatrixKeys]: any }
      stepLimit?: number
      stepCellLimit?: number
      allowRecursive?: boolean
      uniqueId?: boolean
    },
    callback: FindCallback<
      { [key in ConstantStringOrDefault<T> | UserId]: any }
    >
  ): Promise<any>
  findUserUp(callback: FindCallback<{ [key in UserId]: any }>): Promise<any>
  findGenerator<T extends object>(
    options: T,
    generatorFunction: FindCallback<{ [key in MatrixKeys]: any }>,
    searcher?: (
      options: T,
      callback: FindCallback<{ [key in MatrixKeys]: any }>
    ) => any
  ): Promise<any>
  findGenerator(
    generatorFunction: FindCallback<{ [key in MatrixKeys]: any }>,
    searcher?: (
      options: object,
      callback: FindCallback<{ [key in MatrixKeys]: any }>
    ) => any
  ): Promise<any>
  findCellDownGenerator: this["findCellDown"]
  findCellUpGenerator: this["findCellUp"]
  findUserDownGenerator: this["findUserDown"]
  findUserUpGenerator: this["findUserUp"]
  getFirstUnfilledCell: <T extends string>(options: {
    fields?: T[] | MatrixKeys[]
    filter?: {
      [key in MatrixKeys | ConstantStringOrDefault<T>]: any
    }
    limit?: number
    userFilter?: { [key in UserKeys]: any }
    userLimit?: number
    stepFilter?: {
      [key in MatrixKeys | ConstantStringOrDefault<T>]: any
    }
    stepLimit?: number
    stepUserFilter?: { [key in UserKeys]: any }
    stepUserLimit?: number
    maxDeep?: number
    checkCell?: (
      cell: null | { [key in ConstantStringOrDefault<T> | MatrixId]: any },
      step: number
    ) => boolean
    connection: Connection
  }) => Promise<null | { [key in ConstantStringOrDefault<T> | MatrixId]: any }>
  getUserUnfilledCell: <T extends string>(options: {
    fields?: T[] | MatrixKeys[]
    filter?: {
      [key in MatrixKeys | ConstantStringOrDefault<T>]: any
    }
    userFilter?: { [key in UserKeys]: any }
    userLimit?: number
    stepFilter?: {
      [key in MatrixKeys | ConstantStringOrDefault<T>]: any
    }
    stepLimit?: number
    stepUserFilter?: { [key in UserKeys]: any }
    stepUserLimit?: number
    checkCell?: (
      cell: null | { [key in ConstantStringOrDefault<T> | MatrixId]: any },
      step: number
    ) => boolean
    connection: Connection
  }) => Promise<null | { [key in ConstantStringOrDefault<T> | MatrixId]: any }>
  getRow: <T extends string>(options: {
    fields?: T[] | MatrixKeys[]
    filter?: {
      [key in MatrixKeys | ConstantStringOrDefault<T>]: any
    }
    limit?: number
    userFilter?: { [key in UserKeys]: any }
    userLimit?: number
    deep?: number
    fixedStructure?: boolean
    connection: Connection
  }) => Promise<
    Array<null | { [key in ConstantStringOrDefault<T> | MatrixId]: any }>
  >
}

declare type FindCallback<T extends { [key: string]: any }> = (
  row: Array<T>,
  currentStep: number,
  result: (value?: any) => void,
  stop: () => void
) => any

declare type IsBelowType<T, K, J> = { isBelow: boolean } & (K extends boolean
  ? { path: Array<J | null> }
  : {}) &
  (T extends boolean ? { step: number } : {})

declare type CreateStructure = <T extends ManagerInstance>(options: {
  manager: T
  deep: number
  shadow: number
}) => StructureInstanceWithGeneric<T>

declare type StructureInstanceWithGeneric<T> = T extends ManagerInstance<
  infer MatrixCollation,
  infer MatrixKeys,
  infer MatrixId,
  infer UserCollation,
  infer UserKeys,
  infer UserId
>
  ? StructureInstance<
      MatrixCollation,
      MatrixKeys,
      MatrixId,
      UserCollation,
      UserKeys,
      UserId
    >
  : never

declare interface EngineInstance<S, MatrixKeys, MatrixId> {
  createCell: <K extends string>(options: {
    cellValues: { [key in K]: any } | { [key in MatrixKeys]: any }
    search?: boolean
    connection: Connection
  }) => Promise<{
    cellValues: { [key in ConstantStringOrDefault<K>]: any } &
      { [key in MatrixKeys]?: any }
    searchMeta: any
  }>
  place: (cell: any, meta: any) => Promise<null | { cellId: any; meta: any }>
  search: (
    cellValues: { [key in MatrixKeys]: any },
    connection: Connection
  ) => ReturnType<this["place"]>
}

declare type CreateEngine = <
  T extends StructureInstance,
  K = EngineStructureKeys<T>,
  I = EngineStructureId<T>,
  J extends string
>(options: {
  structure: T
  defaultCellValues?:
    | { [key in J]: any }
    | { [key in EngineStructureKeys<T>]: any }
  engine: EngineFunction<T, ConstantStringOrDefault<J, ""> | K, I>
  engineGenerator: EngineFunction<T, ConstantStringOrDefault<J, ""> | K, I>
}) => EngineInstance<T, ConstantStringOrDefault<J, ""> | K, I>

declare type EngineStructureId<T> = T extends StructureInstance<
  any,
  any,
  infer K,
  any,
  any,
  any
>
  ? K
  : never

declare type EngineStructureKeys<T> = T extends StructureInstance<
  any,
  infer K,
  any,
  any,
  any,
  any
>
  ? K
  : never

declare type EngineFunction<T, MatrixKeys, MatrixId> = (context: {
  cellValues: { [key in MatrixKeys]: any }
  engine: EngineInstance<T, MatrixKeys, MatrixId>
  structure: T
  manager: EngineManagerType<T>
  connection: Connection
}) => any

declare type EngineManagerType<T> = T extends StructureInstance<
  infer A,
  infer B,
  infer C,
  infer D,
  infer E,
  infer F
>
  ? ManagerInstance<A, B, C, D, E, F>
  : never

declare interface ProgramInstance<MatrixKeys, MatrixId> {
  insertCell: <K extends string>(options: {
    useConnection?: Connection
    cellOptions: {
      cellValues: { [key in K]: any } | { [key in MatrixKeys]: any }
      search?: boolean
    }
  }) => Promise<
    CreatedCell<{ [key in ConstantStringOrDefault<K> | MatrixId]: any }>
  >
}

declare type CreatedCell<C> = {
  cellValues: C
  searchMeta: any
}

declare type CreateProgram = <
  T extends EngineInstance,
  S = ProgramEngineStructure<T>,
  MatrixKeys = ProgramEngineKeys<T>,
  MatrixId = ProgramEngineId<T>
>(options: {
  engine: T
  beforeCreateCell?: (context: {
    program: ProgramInstance<MatrixKeys, MatrixId>
    engine: T
    manager: EngineManagerType<S>
    structure: S
    cellOptions: {
      cellValues: { [key in Exclude<MatrixKeys, MatrixId>]: any }
      search?: boolean
    }
    connection: Connection
  }) => any
  beforeInsertCell?: (context: {
    program: ProgramInstance<MatrixKeys, MatrixId>
    engine: T
    manager: EngineManagerType<S>
    structure: S
    cell: CreatedCell<{ [key in Exclude<MatrixKeys, MatrixId>]: any }>
    connection: Connection
  }) => any
  afterInsertCell?: (context: {
    program: ProgramInstance<MatrixKeys, MatrixId>
    engine: T
    manager: EngineManagerType<S>
    structure: S
    cell: CreatedCell<{ [key in MatrixKeys | MatrixId]: any }>
    connection: Connection
  }) => any
  afterCellsUpdate?: (context: {
    program: ProgramInstance<MatrixKeys, MatrixId>
    engine: T
    manager: EngineManagerType<S>
    structure: S
    cell: CreatedCell<{ [key in MatrixKeys | MatrixId]: any }>
    head: { [key in MatrixId]: any }
    connection: Connection
  }) => any
}) => ProgramInstance<MatrixKeys, MatrixId>

declare type ProgramEngineStructure<T> = T extends EngineInstance<
  infer K,
  any,
  any
>
  ? K
  : never
declare type ProgramEngineKeys<T> = T extends EngineInstance<any, infer K, any>
  ? K
  : never
declare type ProgramEngineId<T> = T extends EngineInstance<any, any, infer K>
  ? K
  : never

const Matrix: {
  version: string
  createDbriverManager: CreateDbriverManager
  createStructure: CreateStructure
  createEngine: CreateEngine
  createProgram: CreateProgram
  asyncGeneratorResult: (options: {
    generatorFunction: (...args: any[]) => any
    generatorArguments?: any[]
  }) => Promise<any>
}

export = Matrix
