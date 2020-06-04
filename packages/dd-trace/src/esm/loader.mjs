import tracer from '../../index.js'
import { builtinModules } from 'module'

const parentGetFormat = () => 'node needs to merge resolve and getFormat'

export async function resolve (specifier, context, parentResolve) {
  const { parentURL = '' } = context

  const url = await parentResolve(specifier, context, parentResolve)

  if (!tracer._instrumenter._loader._names ||
      !tracer._instrumenter._loader._names.has(specifier) ||
      builtinModules.includes(specifier) ||
      parentURL === import.meta.url ||
      parentURL.startsWith('dd-trace-wrapper:')) {
    return url
  }

  const format = await parentGetFormat(url, context)
  if (format !== 'commonjs') {
    return {
      url: `dd-trace-wrapper:${specifier}`
    }
  }

  return url
}

export function getFormat (url, context, parentGetFormat) {
  if (url.startsWith('dd-trace-wrapper:')) {
    return {
      format: 'module'
    }
  }

  return parentGetFormat(url, context, parentGetFormat)
}

const traceURL = new URL('../../index.js', import.meta.url).toString()
export async function getSource (url, context, parentGetSource) {
  if (url.startsWith('dd-trace-wrapper:')) {
    const realName = url.replace('dd-trace-wrapper:', '')
    const real = await import(realName)
    const names = Object.keys(real).concat([
      // metadata used by shimmer
      '__original', '__unwrap', '__wrapped'
    ])
    return {
      source: `\
import tracer from '${traceURL}';
import * as namespace from '${url}';
import * as real from '${realName}';

const set = {};

${names.map((n) => `\
let $${n} = real.${n};
export { $${n} as ${n} };
set.${n} = (v) => {
  $${n} = v;
};
`).join('\n')}

tracer._instrumenter._loader._registerESM('${realName}', namespace, set);
`
    }
  }

  return parentGetSource(url, context, parentGetSource)
}
