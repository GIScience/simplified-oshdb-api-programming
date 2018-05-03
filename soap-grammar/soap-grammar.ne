@{%

const keywords = ['areaOfInterest', 'timestamps', 'osmType', 'osmEntityFilter', 'osmTag', 'map', 'flatMap', 'filter', 'groupByEntity', 'aggregateBy', 'aggregateByTimestamp', 'aggregateByGeometry', 'reduce', 'sum', 'count', 'uniq', 'countUniq', 'average', 'weightedAverage', 'forEach', 'collect', 'mapReduceCellsOSMConbribution', 'flatMapReduceCellsOSMContributionGroupedById', 'mapReduceCellsOSMEntitySnapshot', 'flatMapReduceCellsOSMEntitySnapshotGroupedById']

%}

main -> statement:+ {% id %}

statement -> (statementSOAP| statementJAVA) "\n" {% d => d[0][0] %}

statementSOAP ->
  statementSOAPinner {% id %}
  | statementSOAPreturn statementSOAPinner {% d => Object.assign(d[1], {return: d[0]}) %}
  | statementSOAPsave statementSOAPinner {% d => Object.assign(d[1], {defineType: d[0].type, defineVariable: d[0].variable}) %}
statementSOAPreturn -> "return" __ {% id %}
statementSOAPsave -> ([A-Z] [a-zA-Z0-9]:*) __ ([a-z] [a-zA-Z0-9]:*) _ "=" _ {% d => ({type: d[0][0] + d[0][1].join(''), variable: d[2][0] + d[2][1].join('')}) %}
statementSOAPinner -> keyword "(" parentheses ")" {% d => ({type: 'soap', command: d[0], content: d[2]}) %}

statementJAVA -> parentheses {% (d, l, reject) => {
  for (const kw of keywords) if (d[0].match(new RegExp(`(^| )${kw}\\(`))) return reject
  return {
    type: 'java',
    content: d[0],
  }
} %}

keyword -> [a-zA-Z]:* {% (d, l, reject) => {
  const result = d[0].join('')
  return (keywords.includes(result)) ? result : reject  
} %}

parentheses ->
  ([^()\n]:* {% d => d[0].join('') %}) "(" parentheses ")" parentheses {% d => d.join('') %}
  | [^()\n]:* {% d => d[0].join('') %}

_ -> [\s]:* {% d => null %}
__ -> [\s]:+ {% d => null %}
