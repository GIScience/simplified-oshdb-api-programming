const nearley = require('nearley')
const grammar = require('../dist/soap-grammar')

const MAP_REDUCER_INNER = '___mapReducer2'
const AGGREGATE_BY_TIMESTAMP = (b, mapReducibleType) => (b) ? `MapAggregator<OSHDBCombinedIndex<GridCell, OSHDBTimestamp>, ${mapReducibleType}> ___mapReducer2 = ___mapReducer.aggregateByTimestamp(snapshot -> snapshot.getTimestamp());` : `MapAggregator<GridCell, ${mapReducibleType}> ___mapReducer2 = ___mapReducer;`
const PARAMETER = (name, type) => `___p.get("${name}").to${type}()`
const CAST_RESULT = r => `return Cast.result(\n${r}\n);\n`
const INDEX_REDUCE = (m, f) => `  Index.reduce(\n    ${m},\n    ${f}\n  )`
const INDEX_MAP = (m, f) => `Index.map(\n      ${m},\n      ${f}\n    )`

// PARSE

const parseToAst = s => new nearley.Parser(nearley.Grammar.fromCompiled(grammar)).feed(`${s.trim()}\n`).results[0]

// HELPING FUNCTIONS

const contentToJava = c => {
  switch (c.type) {
    case 'java':
      return c.content
    case 'parameter':
      return PARAMETER(c.parameterName, c.parameterType[0].toUpperCase() + c.parameterType.slice(1))
  }
}

const filterAst = (ast, type) => ast.filter(x => x.type === type)

const directive = (ast, param, defaultValue=null) => {
  for (const a of filterAst(ast, 'soap-directive')) if (a[param] !== undefined) return a[param]
  return defaultValue
}

const soapAll = ast => {
  let soap = ''
  for (const a of filterAst(ast, 'soap')) soap += `\n        .${a.command}(${a.content.map(contentToJava).join('')})`
  return `${MAP_REDUCER_INNER}${soap}`
}

const soapDefine = ast => {
  let define = null
  for (const a of filterAst(ast, 'soap')) if (a.defineVariable) {
    if (define !== null) return [null, ['Too many assignments (x = ...) in the SOAP statements.  Please use only one assignment at maximum.']]
    define = a
  }
  if (define === null) return [null, ['No assignment (x = ...) found.']]
  return [define, null]
}

const soapAggregate = ast => {
  let aggregate = filterAst(ast, 'soap-aggregate')
  if (aggregate.length > 1) return [null, ['Too many SOAP aggregation statements.  Please use only one SOAP aggregation statement at maximum.']]
  if (aggregate.length == 0) return [null, null]
  return [aggregate[0], null]
}

const javaAll = ast => filterAst(ast, 'java').map(a => a.content.map(contentToJava).join('')).join('\n        ')

const resultErrors = es => ({errors: es})

// EXPORT FUNCTION

module.exports.soapToMeasure = s => {
  let ast = parseToAst(s)
  const errors = []
  const result = {}
  
  // meta data
  result.mapReducibleType = directive(ast, 'mapReducibleType', 'OSMEntitySnapshot')
  result.date = directive(ast, 'date')
  result.daysBefore = directive(ast, 'daysBefore')
  result.interval = directive(ast, 'interval')
  result.refersToTimespan = (result.date !== null || result.daysBefore !== null || result.interval !== null)
  
  // produce code
  let code = soapAll(ast)
  const range = javaAll(ast)
  if (filterAst(ast, 'java') && range !== '') {
    const [define, es] = soapDefine(ast)
    if (es) return resultErrors(es)
    const domain = (define.defineType !== null) ? `(${define.defineType} ${define.defineVariable})` : define.defineVariable
    code = INDEX_MAP(code, `${domain} -> {\n        ${range}\n      }`)
  }
  const [aggregate, es] = soapAggregate(ast)
  if (es) return resultErrors(es)
  if (aggregate !== null) {
    const aggregateFunction = (aggregate.method) ? `Lineage::${aggregate.method}` : aggregate.content.map(contentToJava).join('')
    code = INDEX_REDUCE(code, aggregateFunction)
  }
  code = CAST_RESULT(code)
  code = AGGREGATE_BY_TIMESTAMP(result.refersToTimespan, result.mapReducibleType) + '\n\n' + code
  result.code = code
  
  return result
}
