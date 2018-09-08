'use strict'

describe('ScopeManager', () => {
  let ScopeManager
  let scopeManager

  beforeEach(() => {
    ScopeManager = require('../../../src/scope/new/scope_manager')

    scopeManager = new ScopeManager()
  })

  it('should be a singleton', () => {
    expect(new ScopeManager()).to.equal(scopeManager)
  })

  it('should support activating a span', () => {
    const span = {}

    scopeManager.activate(span, () => {
      expect(scopeManager.active()).to.equal(span)
    })
  })

  it('should support multiple simultaneous scopes', () => {
    const span1 = {}
    const span2 = {}

    scopeManager.activate(span1, () => {
      scopeManager.activate(span2, () => {
        expect(scopeManager.active()).to.equal(span2)
      })

      expect(scopeManager.active()).to.equal(span1)
    })
  })

  it('should propagate parent context to children', done => {
    const span = {}

    scopeManager.activate(span, () => {
      setImmediate(() => {
        expect(scopeManager.active()).to.equal(span)
        done()
      })
    })
  })

  it('should propagate parent context to descendants', done => {
    const span = {}

    scopeManager.activate(span, () => {
      setImmediate(() => {
        setImmediate(() => {
          expect(scopeManager.active()).to.equal(span)
          done()
        })
      })
    })
  })
})
