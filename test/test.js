const assert = require('assert')
const fs = require('fs')
const nearley = require('nearley')
const path = require('path')

const grammar = require('../dist/soap-grammar')
const {soapToMeasure} = require('../soap-to-java/soap-to-measure')

const pathExamples = 'soap-examples/'

const parseToAst = s => new nearley.Parser(nearley.Grammar.fromCompiled(grammar)).feed(`${s.trim()}\n`).results[0]

console.log(soapToMeasure(fs.readFileSync(path.join(pathExamples, 'parameter03.soap'), 'utf-8')))

describe('ast', () => {
  const filesJson = fs.readdirSync(pathExamples).filter(x => x.endsWith('.ast.json')).map(x => x.slice(0, -9))
  for (const f of fs.readdirSync(pathExamples).filter(x => x.endsWith('.soap')).filter(x => filesJson.includes(x.slice(0, -5)))) {
    it(`test example file ${f}`, () => {
      const ast1 = parseToAst(fs.readFileSync(path.join(pathExamples, f), 'utf-8'))
      const ast2 = JSON.parse(fs.readFileSync(path.join(pathExamples, f.replace(/\.soap$/, '.ast.json')), 'utf-8'))
      assert.deepEqual(ast1, ast2)
    })
  }
})

describe('soapToMeasure', () => {
  const filesMeasure = fs.readdirSync(pathExamples).filter(x => x.endsWith('.measure.json')).map(x => x.slice(0, -13))
  for (const f of fs.readdirSync(pathExamples).filter(x => x.endsWith('.soap')).filter(x => filesMeasure.includes(x.slice(0, -5)))) {
    it(`test example file ${f}`, () => {
      const measure1 = soapToMeasure(fs.readFileSync(path.join(pathExamples, f), 'utf-8'))
      const measure2 = JSON.parse(fs.readFileSync(path.join(pathExamples, f.replace(/\.soap$/, '.measure.json')), 'utf-8'))
      assert.deepEqual(measure1, measure2)
    })
  }
})
