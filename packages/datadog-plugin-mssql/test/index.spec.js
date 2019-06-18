'use strict'

const agent = require('../../dd-trace/test/plugins/agent')
const plugin = require('../src')

wrapIt()

describe('Plugin', () => {
  let sql
  let tracer
  let pool

  withVersions(plugin, 'mssql', version => {
    beforeEach(() => {
      tracer = require('../../dd-trace')
    })

    describe('without configuration', () => {
      before(() => {
        sql = require(`../../../versions/mssql@${version}`).get()

        // return agent.load(plugin, 'mssql').then(() => {
        // })
      })

      after(() => {
        return agent.close()
      })

      before((done) => {
        pool = sql.connect({
          server: 'localhost',
          user: 'sa',
          password: 'DD_HUNTER2',
          database: 'master'
        }, done)
      })

      after(() => {
        sql.close()
      })

      it('should propagate context to callbacks', done => {
        if (process.env.DD_CONTEXT_PROPAGATION === 'false') return done()

        const span = tracer.startSpan('test')

        tracer.scope().activate(span, () => {
          const span = tracer.scope().active()

          new sql.Request().query('SELECT 1 + 1 AS solution', () => {
            expect(tracer.scope().active()).to.equal(span)
            done()
          })
        })
      })

      it('should run the callback in the parent context', done => {
        if (process.env.DD_CONTEXT_PROPAGATION === 'false') return done()

        new sql.Request().query('SELECT 1 + 1 AS solution', () => {
          expect(tracer.scope().active()).to.be.null
          done()
        })
      })

      it('should do automatic instrumentation', done => {
        agent
          .use(traces => {
            expect(traces[0][0]).to.have.property('service', 'test-mssql')
            expect(traces[0][0]).to.have.property('resource', 'SELECT 1 + 1 AS solution')
            expect(traces[0][0]).to.have.property('type', 'sql')
            expect(traces[0][0].meta).to.have.property('db.name', 'master')
            expect(traces[0][0].meta).to.have.property('db.user', 'sa')
            expect(traces[0][0].meta).to.have.property('db.type', 'mssql')
            expect(traces[0][0].meta).to.have.property('span.kind', 'client')
          })
          .then(done)
          .catch(done)

        new sql.Request().query('SELECT 1 + 1 AS solution', (err) => {
          done()
          if (err) done(err)
        })
      })

      it('should handle errors', done => {
        let error

        agent
          .use(traces => {
            expect(traces[0][0].meta).to.have.property('error.type', error.name)
            expect(traces[0][0].meta).to.have.property('error.msg', error.message)
            expect(traces[0][0].meta).to.have.property('error.stack', error.stack)
          })
          .then(done)
          .catch(done)

        new sql.Request().query('INVALID', (err) => {
          error = err
        })
      })

      it('should work without a callback', done => {
        agent.use(traces => {
          done()
        })

        new sql.Request().query('SELECT 1 + 1 AS solution')
      })
    })
  })
})
