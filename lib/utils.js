exports.isFunction = (value) => typeof value === "function"
exports.isObject = (value) => !!value && typeof value === "object"

function copy(o) {
  if (exports.isObject(o)) {
    const c = {}
    for (const [k, v] of Object.entries(o)) {
      c[k] = copy(v)
    }
    return c
  }
  return o
}

function has(o, p) {
  return o.hasOwnProperty(p)
}

exports.has = has

function merge(o1, o2, copyO1 = true) {
  let o = copyO1 ? copy(o1) : o1
  for (const [k, v] of Object.entries(o2)) {
    if (has(o, k)) {
      if (exports.isObject(v) && exports.isObject(o[k])) {
        o[k] = merge(o[k], v, false)
      } else {
        o[k] = copy(v)
      }
    } else {
      o[k] = copy(v)
    }
  }
  return o
}
exports.merge = merge

exports.isPint = (value) => Number.isInteger(value) && value > 0

exports.asyncGeneratorResult = async ({
  generatorFunction,
  generatorArguments = [],
}) => {
  for await (const result of generatorFunction(...generatorArguments)) {
    if (result) return result
  }
  return null
}
