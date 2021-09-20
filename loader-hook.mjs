import { resolve as origResolve, getFormat, getSource } from 'import-in-the-middle/hook.mjs'
import path from 'path'
import names from './packages/dd-trace/src/plugins/all-shimmed-files.js'

const nodeRe = /^node:(.*)/
const fileRe = /^file:\/\//
const notBareRe = /^[./]/
const modulesRe = /.*node_modules\/(.*)/

export async function resolve (specifier, context, parentResolve) {
  if (context.parentURL && context.parentURL.startsWith('iitm:')) {
    return parentResolve(specifier.replace('iitm:', ''), context, parentResolve)
  }
  let name = specifier
  if (name.startsWith('iitm:')) return origResolve(specifier, context, parentResolve)
  const matchedNode = name.match(nodeRe)
  if (matchedNode) {
    name = matchedNode[1]
    return (names.has(name) ? origResolve : parentResolve)(specifier, context, parentResolve)
  }
  name = name.replace(fileRe, '')
  if (!notBareRe.test(name)) {
    // bare specifier. just search.
    return (names.has(name) ? origResolve : parentResolve)(specifier, context, parentResolve)
  }
  if (!path.isAbsolute(name)) {
    name = path.relative(context.parentURL, name)
  }
  const matchedFromModules = name.match(modulesRe)
  if (!matchedFromModules) {
    return parentResolve(specifier, context, parentResolve)
  }
  name = matchedFromModules[1]
  return (names.has(name) ? origResolve : parentResolve)(specifier, context, parentResolve)
}

export { getFormat }

export { getSource }
