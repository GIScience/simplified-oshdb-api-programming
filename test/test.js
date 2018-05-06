const assert = require('assert')
const fs = require('fs')
const nearley = require('nearley')
const path = require('path')

const grammar = require('../dist/soap-grammar')
const {soapToJava} = require('../soap-to-java/soap-to-java')

const pathExamples = 'soap-examples/'

const parseToAst = s => new nearley.Parser(nearley.Grammar.fromCompiled(grammar)).feed(`${s.trim()}\n`).results[0]

describe('ast', () => {
  const filesJson = fs.readdirSync(pathExamples).filter(x => x.endsWith('.json')).map(x => x.slice(0, -5))
  for (const f of fs.readdirSync(pathExamples).filter(x => x.endsWith('.soap')).filter(x => filesJson.includes(x.slice(0, -5)))) {
    it(`test example file ${f}`, () => {
      assert.deepEqual(parseToAst(fs.readFileSync(path.join(pathExamples, f), 'utf-8')), JSON.parse(fs.readFileSync(path.join(pathExamples, f.replace(/\.soap$/, '.json')), 'utf-8')))
    })
  }
})

describe('soapToJava', () => {
  const filesJava = fs.readdirSync(pathExamples).filter(x => x.endsWith('.java')).map(x => x.slice(0, -5))
  for (const f of fs.readdirSync(pathExamples).filter(x => x.endsWith('.soap')).filter(x => filesJava.includes(x.slice(0, -5)))) {
    it(`test example file ${f}`, () => {
      assert.equal(soapToJava(fs.readFileSync(path.join(pathExamples, f), 'utf-8')).trim(), fs.readFileSync(path.join(pathExamples, f.replace(/\.soap$/, '.java')), 'utf-8').trim())
    })
  }
})
