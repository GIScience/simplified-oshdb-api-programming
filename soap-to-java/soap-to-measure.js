const nearley = require('nearley')
const grammar = require('../dist/soap-grammar')

const MAP_REDUCER_INNER = '___mapReducer2'
const AGGREGATE_BY_TIMESTAMP = (b, mapReducibleType) => (b) ? `MapAggregator<OSHDBCombinedIndex<GridCell, OSHDBTimestamp>, ${mapReducibleType}> ___mapReducer2 = ___mapReducer.aggregateByTimestamp(snapshot -> snapshot.getTimestamp());` : `MapAggregator<GridCell, ${mapReducibleType}> ___mapReducer2 = ___mapReducer;`
const PARAMETER = (name, type) => `___p.get("${name}").to${type}()`
const CAST_RESULT = r => `return Cast.result(\n${r}\n);\n`
const INDEX_REDUCE = (m, f) => `  Index.reduce(\n    ${m},\n    ${f}\n  )`
const INDEX_MAP = (m, f) => `Index.map(\n      ${m},\n      ${f}\n    )`

// PARSE

const parseToAst = s => {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))
  let lineNumber = 0
  try {
    for (const line of s.trim().split('\n')) {
      lineNumber++
      parser.feed(`${line}\n`)
    }
  } catch (e) {
    return [null, [[lineNumber, e.toString()]]]
  }
  if (parser.results[0] === null || parser.results[0] === undefined) return [null, [[null, 'Error: Unknown parser error']]]
  return [parser.results[0], null]
}

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
    if (define !== null) return [null, [[null, 'Error: Too many assignments (x = ...) in the SOAP statements.  Please use only one assignment at maximum.']]]
    define = a
  }
  if (define === null) return [null, [[null, 'Error: No assignment (x = ...) found.']]]
  return [define, null]
}

const soapAggregate = ast => {
  let aggregate = filterAst(ast, 'soap-aggregate')
  if (aggregate.length > 1) return [null, [[null, 'Error: Too many SOAP aggregation statements.  Please use only one SOAP aggregation statement at maximum.']]]
  if (aggregate.length == 0) return [null, null]
  return [aggregate[0], null]
}

const javaAll = ast => filterAst(ast, 'java').map(a => a.content.map(contentToJava).join('')).join('\n        ')

const checkDoubleDirective = (ast, param) => filterAst(ast, 'soap-directive').filter(sd => sd[param] !== undefined).length > 1

const resultErrors = es => ({errors: es, warnings: []})

// EXPORT FUNCTION

module.exports.soapToMeasureWithWarnings = s => {
  const [ast, measure] = soapToMeasure(s)
  if (measure.errors.length) return measure
  measure.warnings = measure.warnings.concat(['mapReducibleType', 'date', 'daysBefore', 'intervalInDays', 'refersToTimespan'].filter(param => checkDoubleDirective(ast, param)).map(param => [null, `Warning: There are several SOAP directives for the parameter ${param}.`]))
  measure.warnings = measure.warnings.concat(filterAst(ast, 'soap-directive').filter(sd => sd.unknown !== undefined).map(sd => [null, `Warning: The SOAP directive "${sd.unknown}" is unknown.`]))
  return measure
}

module.exports.soapToMeasure = s => soapToMeasure(s)[1]

const soapToMeasure = s => {
  const measure = {
    errors: [],
    warnings: [],
  }

  // parse
  const [ast, es] = parseToAst(s)
  if (es) return [ast, resultErrors(es)]

  // meta data
  measure.imports = filterAst(ast, 'import').map(a => a.content)
  measure.mapReducibleType = directive(ast, 'mapReducibleType', 'OSMEntitySnapshot')
  measure.date = directive(ast, 'date')
  measure.daysBefore = directive(ast, 'daysBefore')
  measure.intervalInDays = directive(ast, 'intervalInDays')
  measure.refersToTimespan = (measure.daysBefore !== null || measure.intervalInDays !== null)

  // produce code
  let code = soapAll(ast)
  const range = javaAll(ast)
  if (filterAst(ast, 'java') && range !== '') {
    const [define, es] = soapDefine(ast)
    if (es) return [ast, resultErrors(es)]
    const domain = (define.defineType !== null) ? `(${define.defineType} ${define.defineVariable})` : define.defineVariable
    code = INDEX_MAP(code, `${domain} -> {\n        ${range}\n      }`)
  }
  const [aggregate, esAggregate] = soapAggregate(ast)
  if (esAggregate) return [ast, resultErrors(esAggregate)]
  if (aggregate !== null) {
    const aggregateFunction = (aggregate.method) ? `Lineage::${aggregate.method}` : aggregate.content.map(contentToJava).join('')
    code = INDEX_REDUCE(code, aggregateFunction)
  }
  code = CAST_RESULT(code)
  code = AGGREGATE_BY_TIMESTAMP(measure.refersToTimespan, measure.mapReducibleType) + '\n\n' + code
  measure.code = code

  return [ast, measure]
}
