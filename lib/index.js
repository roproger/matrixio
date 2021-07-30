const createDbriverManager = require("./manager")
const createStructure = require("./structure")
const createEngine = require("./engine")
const createProgram = require("./program")
const { asyncGeneratorResult } = require("./utils")

const Matrix = {
  version: "0.5.1",
  createDbriverManager,
  createStructure,
  createEngine,
  createProgram,
  asyncGeneratorResult,
}

module.exports = Matrix
