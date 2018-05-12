@{%

const moo = require('moo')

const keywords = ['areaOfInterest', 'timestamps', 'osmType', 'osmEntityFilter', 'osmTag', 'map', 'flatMap', 'filter', 'groupByEntity', 'aggregateBy', 'aggregateByTimestamp', 'aggregateByGeometry', 'reduce', 'sum', 'count', 'uniq', 'countUniq', 'average', 'weightedAverage', 'forEach', 'collect', 'mapReduceCellsOSMConbribution', 'flatMapReduceCellsOSMContributionGroupedById', 'mapReduceCellsOSMEntitySnapshot', 'flatMapReduceCellsOSMEntitySnapshotGroupedById']

const keywordsAggregate = ['lineageBy']

const aggregateMethods = ['min', 'max', 'sum', 'average', 'saturation']

const mooJava = moo.compile({
  java: {match: /[^@]+/, lineBreaks: true},
  parameterWithType: {match: /@[a-z][a-zA-Z0-9]*_[a-zA-Z]+/, value: x => x.slice(1).split('_')},
  parameter: {match: /@[a-z][a-zA-Z0-9]*/, value: x => x.slice(1)},
  illegalParameter: /@/,
})
const tokenizeJava = s => Array.from(mooJava.reset(s)).map(t => {
  switch (t.type) {
    case 'java':
      return {type: 'java', content: t.value}
    case 'parameter':
      let type = 'String'
      if (t.value.startsWith('number')) type = 'Integer'
      if (t.value.startsWith('weight') || t.value.startsWith('factor')) type = 'Double'
      if (t.value.startsWith('is') || t.value.startsWith('has') || t.value.startsWith('needs')) type = 'Boolean'
      return {type: 'parameter', parameterName: t.value, parameterType: type}
    case 'parameterWithType':
      if (['str', 'string'].includes(t.value[1].toLowerCase())) t.value[1] = 'String'
      else if (['int', 'integer'].includes(t.value[1].toLowerCase())) t.value[1] = 'Integer'
      else if (['double'].includes(t.value[1].toLowerCase())) t.value[1] = 'Double'
      else if (['bool', 'boolean'].includes(t.value[1].toLowerCase())) t.value[1] = 'Boolean'
      return {type: 'parameter', parameterName: t.value[0], parameterType: t.value[1]}
    case 'illegalParameter':
      return {type: 'java', content: t.value}
  }
})

%}

main -> statementOrDirective:+ {% d => d[0].reduce((acc, val) => acc.concat(val), []) %}

statementOrDirective -> (emptyLine | comment | directiveSOAP | statementSOAP | importJAVA | statementJAVA) {% d => d[0][0] %}

emptyLine -> _ "\n" {% () => ({type: 'emptyLine'}) %}

comment -> _ "//" ([^\n]:*) "\n" {% (d, l, reject) => {
  if (d[2][0].join('').match(/[\/]{2}$/)) return reject
  return [{type: 'comment', command: d[2][0].join('')}]
} %}

directiveSOAP -> _ "//" __ directiveSOAPinner (_ "," _ directiveSOAPinner):* __ "//" _ "\n" {% d => [d[3]].concat(d[4].map(x => x[3])).map(sd => Object.assign({type: 'soap-directive'}, sd)) %}
directiveSOAPinner -> [^,\n]:+ {% (d, l, reject) => {
  const s = d[0].join('')
  let match
  if (s.startsWith(' ') || s.endsWith(' ')) return reject
  if (s == 'snapshots') return {mapReducibleType: 'OSMEntitySnapshot'}
  if (s == 'contributions') return {mapReducibleType: 'OSMContribution'}
  if (s == 'now') return {date: 'now'}
  if (s.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) return {date: s}
  if (s.match(/last +day/)) return {daysBefore: 1}
  if (s.match(/last +month/)) return {daysBefore: 30}
  if (s.match(/last +year/)) return {daysBefore: 360}
  match = (/last +([0-9]+) +days?/.exec(s))
  if (match) return {daysBefore: parseInt(match[1])}
  match = (/last +([0-9]+) +months?/.exec(s))
  if (match) return {daysBefore: parseInt(match[1]) * 30}
  match = (/last +([0-9]+) +years?/.exec(s))
  if (match) return {daysBefore: parseInt(match[1]) * 360}
  if (s == 'daily') return {intervalInDays: 1}
  if (s == 'monthly') return {intervalInDays: 30}
  if (s == 'yearly') return {intervalInDays: 360}
  if (s.match(/every +day/)) return {intervalInDays: 1}
  if (s.match(/every +month/)) return {intervalInDays: 30}
  if (s.match(/every +year/)) return {intervalInDays: 360}
  match = (/every +([0-9]+) +days?/.exec(s))
  if (match) return {intervalInDays: parseInt(match[1])}
  match = (/every +([0-9]+) +months?/.exec(s))
  if (match) return {intervalInDays: parseInt(match[1]) * 30}
  match = (/every +([0-9]+) +years?/.exec(s))
  if (match) return {intervalInDays: parseInt(match[1]) * 360}
  return {unknown: s}
} %}

statementSOAP ->
  statementSOAPinner _ "\n" {% d => d[0] %}
  | statementSOAPreturn statementSOAPinner _ "\n" {% d => Object.assign(d[1], {return: d[0]}) %}
  | statementSOAPsave statementSOAPinner _ "\n" {% d => Object.assign(d[1], {defineType: d[0].type, defineVariable: d[0].variable}) %}
  | statementSOAPaggregateMethod _ "\n" {% d => d[0] %}
  | statementSOAPaggregate _ "\n" {% d => d[0] %}
statementSOAPsave -> _ ([a-zA-Z0-9]:+ " "):? _ ([a-z] [a-zA-Z0-9]:*) _ "=" _ {% d => ({type: (d[1]) ? d[1][0].join('') : null, variable: d[3][0] + d[3][1].join('')}) %}
statementSOAPreturn -> "return" __ {% id %}
statementSOAPinner -> keyword "(" parentheses ")" {% d => ({type: 'soap', command: d[0], content: tokenizeJava(d[2])}) %}
statementSOAPaggregateMethod -> keywordAggregate "(" aggregateMethod ")" {% d => [{type: 'soap-aggregate', command: d[0], method: d[2]}] %}
statementSOAPaggregate -> keywordAggregate "(" parentheses ")" {% (d, l, reject) => (aggregateMethods.includes(d[2])) ? reject : [{type: 'soap-aggregate', command: d[0], content: tokenizeJava(d[2])}] %}

importJAVA -> _ "import" [^\n]:+ ";" _ "\n" {% d => ({type: 'import', content: d[2].join('').trim()}) %}

statementJAVA -> parentheses _ "\n" {% (d, l, reject) => {
  if (d[0] === '') return reject
  if (d[0].trim().startsWith('import')) return reject
  if (d[0].match(/^\s*\/{2}.*/)) return reject
  for (const kw of keywords) if (d[0].match(new RegExp(`^ *${kw}\\(`))) return reject
  for (const kw of keywordsAggregate) if (d[0].match(new RegExp(`^ *${kw}\\(`))) return reject
  if (d[0].match(/^ *[a-zA-Z0-9]* *([a-z][a-zA-Z0-9]*) *=/)) return reject
  return [{
    type: 'java',
    content: tokenizeJava(d[0]),
  }]
} %}

keyword -> [a-zA-Z]:* {% (d, l, reject) => {
  const result = d[0].join('')
  return (keywords.includes(result)) ? result : reject  
} %}

keywordAggregate -> [a-zA-Z]:* {% (d, l, reject) => {
  const result = d[0].join('')
  return (keywordsAggregate.includes(result)) ? result : reject  
} %}

aggregateMethod -> [a-zA-Z]:* {% (d, l, reject) => {
  const result = d[0].join('')
  return (aggregateMethods.includes(result)) ? result : reject  
} %}

parentheses ->
  ([^(){}\"\n]:* {% d => d[0].join('') %}) "(" parenthesesInner ")" parentheses {% d => d.join('') %}
  | ([^(){}\"\n]:* {% d => d[0].join('') %}) "{" parenthesesInner "}" parentheses {% d => d.join('') %}
  | ([^(){}\"\n]:* {% d => d[0].join('') %}) "\"" [^\"]:* "\"" parentheses {% d => [d[0], d[1], d[2].join(''), d[3], d[4]].join('') %}
  | [^(){}\"\n]:* {% d => d[0].join('') %}

parenthesesInner ->
  ([^(){}\"]:* {% d => d[0].join('') %}) "(" parenthesesInner ")" parenthesesInner {% d => d.join('') %}
  | ([^(){}\"]:* {% d => d[0].join('') %}) "{" parenthesesInner "}" parenthesesInner {% d => d.join('') %}
  | ([^(){}\"]:* {% d => d[0].join('') %}) "\"" [^\"]:* "\"" parenthesesInner {% d => [d[0], d[1], d[2].join(''), d[3], d[4]].join('') %}
  | [^(){}\"]:* {% d => d[0].join('') %}

_ -> [ ]:* {% d => null %}
__ -> [ ]:+ {% d => null %}
