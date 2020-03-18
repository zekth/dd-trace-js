'use strict'

const web = require('../../dd-trace/src/plugins/util/web')

function createWrapReloadCluster (tracer, config) {
  return function wrapReloadCluster (reloadCluster) {
    return function reloadClusterWithTrace (file, opt) {
      const clusterManager = reloadCluster.apply(this, arguments)
    }
  }
}

module.exports = [
  {
    name: 'edgemicro',
    versions: ['>=3'],
    file: 'cli/lib/reload-cluster.js',
    patch (reloadCluster, tracer, config) {
      return createWrapReloadCluster(tracer, config)(reloadCluster)
    },
    unpatch (reloadCluster) {
      unwrapReloadCluster(reloadCluster)
    }
  }
]
