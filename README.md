# Simplified OSHDB API Programming (SOAP)

This software parses SOAP code and converts it to JAVA code, which is to be consumed by the [OpenStreetMap History Database (OSHDB)](???).

## Install

To install this software, please run

```bash
npm install git+https://git@github.com/GIScience/simplified-oshdb-api-programming.git
```

If you have cloned the repository, you can install the software and run tests as follows:

```bash
npm install
npm test
```

## Use

The following command converts SOAP code to java code that can be used as a measure (see [Measure REST OSHDB](???)):

```javascript
const soap = require('simplified-oshdb-api-programming/dist/soap-to-measure')
soap.soapToMeasure('... code ...')
```

## Develop

In order to improve the software, you can run the following command to retrieve the abstract syntax tree (ast):

```java
npm run build && cat soap-examples/simple01.soap | npx nearley-test dist/soap-grammar.js --quiet
```

## Author

This software is written and maintained by Franz-Benjamin Mocnik, <mocnik@uni-heidelberg.de>, GIScience Research Group, Institute of Geography, Heidelberg University.

The development has been supported by the DFG project *A framework for measuring the fitness for purpose of OpenStreetMap data based on intrinsic quality indicators* (FA 1189/3-1).

(c) by Heidelberg University, 2018.

## License

The code is licensed under the [MIT license](https://github.com/giscience/measures-rest-oshdb/blob/master/LICENSE).
