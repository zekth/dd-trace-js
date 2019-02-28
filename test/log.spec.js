'use strict'

/* eslint-disable no-console */

const levels = ['debug', 'info', 'warn', 'error']

describe('log', () => {
  let log
  let logger
  let clock

  beforeEach(() => {
    levels.forEach(level => sinon.stub(console, level))

    clock = sinon.useFakeTimers()

    logger = {
      debug: sinon.spy(),
      error: sinon.spy()
    }

    log = require('../src/log')
  })

  afterEach(() => {
    log.reset()
    clock.restore()
    levels.forEach(level => console[level].restore())
  })

  it('should support chaining', () => {
    expect(() => {
      log
        .use(logger)
        .backoff(true)
        .error('error')
        .debug('debug')
        .reset()
    }).to.not.throw()
  })

  levels.forEach(level => {
    describe(level, () => {
      it('should log to console by default', () => {
        log[level]('message')

        expect(console[level]).to.have.been.calledWith('message')
      })

      it('should accept placeholder arguments', () => {
        log[level]('foo %s', ['bar'])

        expect(console[level]).to.have.been.calledWith('foo bar')
      })

      it('should support callbacks that return placeholder arguments', () => {
        log[level]('foo %s', () => ['bar'])

        expect(console[level]).to.have.been.calledWith('foo bar')
      })

      it('should back off by default', () => {
        log[level]('message')
        log[level]('message')

        expect(console[level]).to.have.been.calledOnce

        clock.tick(10 * 1000)

        log[level]('message')

        expect(console[level]).to.have.been.calledTwice
      })

      it('should indicate how many messages were skipped when backing off', () => {
        log[level]('message')
        log[level]('message')

        clock.tick(10 * 1000)

        log[level]('message')

        expect(console[level]).to.have.been.calledWith('message, 1 additional messages skipped.')
      })

      it('should accept a message as an array', () => {
        log[level](['foo', 'bar'])

        expect(console[level]).to.have.been.calledWith('foo bar')
      })
    })
  })

  describe('backoff', () => {
    it('should enable backoff', () => {
      log.backoff(true)
      log.debug('message')
      log.debug('message')

      expect(console.debug).to.have.been.calledOnce
    })

    it('should disable backoff', () => {
      log.backoff(false)
      log.debug('message')
      log.debug('message')

      expect(console.debug).to.have.been.calledTwice
    })
  })

  describe('use', () => {
    it('should set the underlying logger when valid', () => {
      log.use(logger)
      log.debug('message')

      expect(logger.debug).to.have.been.calledWith('message')
    })

    it('be a no op with an empty logger', () => {
      log.use(null)
      log.debug('message')

      expect(console.debug).to.have.been.calledWith('message')
    })

    it('be a no op with an invalid logger', () => {
      log.use('invalid')
      log.debug('message')

      expect(console.debug).to.have.been.calledWith('message')
    })
  })

  describe('reset', () => {
    it('should reset the logger', () => {
      log.use(logger)
      log.reset()
      log.debug('message')

      expect(console.debug).to.have.been.calledWith('message')
    })

    it('should reset the backoff', () => {
      log.use(logger)
      log.reset()
      log.debug('message')
      log.debug('message')

      expect(console.debug).to.have.been.calledOnce
    })
  })
})
