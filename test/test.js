const assert = require('assert')
const fs = require('fs')
const path = require('path')

const {soapToJava} = require('../soap-to-java/soap-to-java')

const pathExamples = 'soap-examples/'

describe('soapToJava', () => {
  for (const f of fs.readdirSync(pathExamples).filter(x => x.endsWith('.soap'))) {
    it(`test example file ${f}`, () => {
      assert.equal(soapToJava(fs.readFileSync(path.join(pathExamples, f), 'utf-8')).trim(), fs.readFileSync(path.join(pathExamples, f.replace(/\.soap$/, '.java')), 'utf-8').trim())
    })
  }
})
