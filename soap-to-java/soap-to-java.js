// npm run build && cat soap-examples/simple01.soap | npx nearley-test dist/soap-grammar.js --quiet

const nearley = require('nearley')
const grammar = require('../dist/soap-grammar')

const MAP_REDUCER = 'mapReducer'

module.exports.soapToJava = (s) => {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))
  let ast = parser.feed(`${s}\n`).results[0]
  
  // check for definition statement
  let ast2 = []
  let astBuffer = []
  const mergeSOAP = () => {
    if (astBuffer.length === 0) return
    if (astBuffer[astBuffer.length - 1].defineType && astBuffer[astBuffer.length - 1].defineVariable) {
      ast2.push({
        type: 'define',
        defineType: astBuffer[astBuffer.length - 1].defineType,
        defineVariable: astBuffer[astBuffer.length - 1].defineVariable,
      })
    } else {
      ast2.push({
        type: 'return',
      })
    }
    astBuffer[astBuffer.length - 1].final = true
    ast2 = ast2.concat(astBuffer)
    astBuffer = []
  }
  for (const a of ast) {
    if (a.type === 'java') {
      mergeSOAP()
      ast2.push(a)
    } else if (a.type === 'soap') astBuffer.push(a)
  }
  mergeSOAP()
  ast = ast2
  
  // produce code
  let code = ''
  for (const a of ast) {
    if (a.type === 'java') code += `${a.content}\n`
    else if (a.type === 'soap') {
        code += `    .${a.command}(${a.content})${(a.final) ? ';' : ''}\n`
    } else if (a.type === 'define') code += `${a.defineType} ${a.defineVariable} = ${MAP_REDUCER}\n`
    else if (a.type === 'return') code += `return ${MAP_REDUCER}\n`
  }
  
  return code
}
