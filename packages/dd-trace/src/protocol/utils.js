'use strict'

const oldId = require('../id')

exports.id = () => new BigUint64Array(oldId().toBuffer().buffer)[0]
