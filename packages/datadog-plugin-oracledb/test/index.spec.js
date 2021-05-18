const { expect } = require('chai')
const agent = require('../../dd-trace/test/plugins/agent')
const plugin = require('../src')

wrapIt()

const config = {
  user: 'test',
  password: 'Oracle18',
  connectString: 'localhost:1521/xepdb1'
}

const dbQuery = 'select current_timestamp from dual'

describe('Plugin', () => {
  let oracledb
  let connection
  let pool

  describe('oracledb', () => {
    withVersions(plugin, 'oracledb', version => {
      describe('without configuration', () => {
        before(async () => {
          await agent.load('oracledb')
          oracledb = require(`../../../versions/oracledb@${version}`).get()
        })
        after(async () => {
          await agent.close()
        })

        describe('with connection', () => {
          before(() => {
            connection = oracledb.getConnection(config)
          })
          after(async () => {
            await connection.close()
          })

          it('should be instrumented for promise API', done => {
            agent.use(traces => {
              expect(traces[0][0]).to.have.property('name', 'oracle.query')
              expect(traces[0][0]).to.have.property('resource', dbQuery)
              expect(traces[0][0]).to.have.property('type', 'sql')
              expect(traces[0][0].meta).to.have.property('service', 'test')
              expect(traces[0][0].meta).to.have.property('span.kind', 'client')
              expect(traces[0][0].meta).to.have.property('sql.query', 'select current_timestamp from dual')
              expect(traces[0][0].meta).to.have.property('db.instance', 'xepdb1')
              expect(traces[0][0].meta).to.have.property('db.hostname', 'localhost')
              expect(traces[0][0].meta).to.have.property('db.port', '1521')
            }).then(done, done)
            connection.execute(dbQuery)
          })

          it('should be instrumented for callback API', done => {
            let callbackRan
            connection.execute(dbQuery, err => {
              expect(err).to.be.null
              callbackRan = true
            })
            agent.use(traces => {
              expect(traces[0][0]).to.have.property('name', 'oracle.query')
              expect(traces[0][0]).to.have.property('resource', dbQuery)
              expect(traces[0][0]).to.have.property('type', 'sql')
              expect(traces[0][0].meta).to.have.property('service', 'test')
              expect(traces[0][0].meta).to.have.property('span.kind', 'client')
              expect(traces[0][0].meta).to.have.property('sql.query', 'select current_timestamp from dual')
              expect(traces[0][0].meta).to.have.property('db.instance', 'xepdb1')
              expect(traces[0][0].meta).to.have.property('db.hostname', 'localhost')
              expect(traces[0][0].meta).to.have.property('db.port', '1521')
              expect(callbackRan).to.be.true
            }).then(done, done)
          })
        })

        describe('with pool', () => {
          before(async () => {
            pool = await oracledb.createPool(config)
            connection = await pool.getConnection()
          })
          after(async () => {
            await connection.close()
            await pool.close()
          })

          it('should be instrumented correctly with correct tags', done => {
            agent.use(traces => {
              expect(traces[0][0]).to.have.property('name', 'oracle.query')
              expect(traces[0][0]).to.have.property('resource', dbQuery)
              expect(traces[0][0]).to.have.property('type', 'sql')
              expect(traces[0][0].meta).to.have.property('service', 'test')
              expect(traces[0][0].meta).to.have.property('span.kind', 'client')
              expect(traces[0][0].meta).to.have.property('sql.query', 'select current_timestamp from dual')
              expect(traces[0][0].meta).to.have.property('db.instance', 'xepdb1')
              expect(traces[0][0].meta).to.have.property('db.hostname', 'localhost')
              expect(traces[0][0].meta).to.have.property('db.port', '1521')
            }).then(done, done)
            connection.execute(dbQuery)
          })
        })
      })
    })
  })
})
