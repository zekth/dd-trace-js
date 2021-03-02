'use strict'

const childProcess = require('child_process')
const path = require('path')
const fs = require('fs')
const udp = require('dgram')

const currentCommit = process.env.GIT_COMMIT_HASH

const dir = process.env.APP_DIR
const meta = require(path.join(__dirname, dir, 'meta.json'))

let udpMessages = ''
const dogstatsd = udp.createSocket('udp4')
dogstatsd.on('message', msg => {
  udpMessages += msg.toString('utf8')
})
dogstatsd.bind(8125, () => {
  const timeout = setTimeout(() => {
    process.exit(1)
  }, meta.timeout * 1000)

  let setupComplete = false

  while (!setupComplete) {
    try {
      if (meta.setup) {
        childProcess.execSync(meta.setup, {
          cwd: dir
        })
      }
      setupComplete = true
    } catch (e) {
      console.error(e)
    }
  }

  const tmpdir = fs.mkdtempSync('/tmp/time.out-')

  childProcess.execSync(`/usr/bin/time -v -o ${tmpdir}/time.out ${meta.run}`, {
    cwd: dir
  })

  const results = fs.readFileSync(`${tmpdir}/time.out`, 'utf8').trim().split('\n').map(x => x.trim().split(': ')).reduce((prev, curr) => {
    prev[curr[0]] = curr[1]
    return prev
  }, {})

  setImmediate(() => {
    dogstatsd.close()
    const metrics = {
      'test': meta.name,
      'version': currentCommit,
      'user.time': parseFloat(results['User time (seconds)'], 10),
      'system.time': parseFloat(results['System time (seconds)'], 10),
      'max.res.size': parseFloat(results['Maximum resident set size (kbytes)'], 10)
    }
    if (udpMessages.length) {
      udpMessages.trim().split('\n').forEach(line => {
        const [metric] = line.split('|')
        const [metricName, metricValue] = metric.split(':')
        metrics[metricName] = Number(metricValue)
      })
    }
    const outfile = `${meta.name}-${currentCommit}.json`
    fs.writeFileSync(outfile, JSON.stringify(metrics, null, 2))
    console.log('metrics written to', outfile)
    clearTimeout(timeout)
  })
})
