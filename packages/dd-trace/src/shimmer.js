// BSD 2-Clause License
// Copyright (c) 2013-2019, Forrest L Norvell
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// * Redistributions of source code must retain the above copyright notice, this
//   list of conditions and the following disclaimer.
//
// * Redistributions in binary form must reproduce the above copyright notice,
//   this list of conditions and the following disclaimer in the documentation
//   and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

'use strict'

// lazy initialize for platforms that don't support WeakMap
let namespaceObjects
function registerModuleNamespace (ns, set) {
  if (namespaceObjects === undefined) {
    namespaceObjects = new WeakMap()
  }
  namespaceObjects.set(ns, set)
}

function defineProperty (obj, name, value) {
  if (namespaceObjects.has(obj)) {
    const set = namespaceObjects.get(obj)
    if (set[name]) {
      set[name](value)
    }
  } else {
    Object.defineProperty(obj, name, {
      configurable: true,
      writable: true,
      value: value
    })
  }
}

function wrap (nodule, name, wrapper) {
  if (!nodule || !nodule[name]) {
    return
  }

  if (!wrapper) {
    return
  }

  if (typeof nodule[name] !== 'function' || typeof wrapper !== 'function') {
    return
  }

  const original = nodule[name]
  const wrapped = wrapper(original, name)

  defineProperty(wrapped, '__original', original)
  defineProperty(wrapped, '__unwrap', function () {
    if (nodule[name] === wrapped) defineProperty(nodule, name, original)
  })
  defineProperty(wrapped, '__wrapped', true)

  defineProperty(nodule, name, wrapped)
  return wrapped
}

function massWrap (nodules, names, wrapper) {
  if (!nodules) {
    return
  } else if (!Array.isArray(nodules)) {
    nodules = [nodules]
  }

  if (!(names && Array.isArray(names))) {
    return
  }

  nodules.forEach(function (nodule) {
    names.forEach(function (name) {
      wrap(nodule, name, wrapper)
    })
  })
}

function unwrap (nodule, name) {
  if (!nodule || !nodule[name]) {
    return
  }

  if (nodule[name].__unwrap) {
    return nodule[name].__unwrap()
  }
}

function massUnwrap (nodules, names) {
  if (!nodules) {
    return
  } else if (!Array.isArray(nodules)) {
    nodules = [nodules]
  }

  if (!(names && Array.isArray(names))) {
    return
  }

  nodules.forEach(function (nodule) {
    names.forEach(function (name) {
      unwrap(nodule, name)
    })
  })
}

module.exports = {
  registerModuleNamespace,
  wrap,
  massWrap,
  unwrap,
  massUnwrap
}
