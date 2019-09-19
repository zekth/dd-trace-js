const base = require('./karma.conf')

module.exports = config => {
  base(config)

  config.set({
    reporters: ['progress'],

    browsers: ['chrome'],

    captureTimeout: 600000,
    retryLimit: 1,
    browserDisconnectTimeout: 90000,
    browserDisconnectTolerance: 1,
    browserNoActivityTimeout: 90000,

    concurrency: 1,

    // https://github.com/LambdaTest/karma-jasmine-sample
    customLaunchers: {
      chrome: {
        base: 'WebDriver',
        config: {
          hostname: 'hub.lambdatest.com',
          port: 80
        },
        browserName: 'chrome',
        platform: 'windows 10',
        version: '71.0',
        name: 'Karma With Heartbeat',
        tunnel: true, // In case karma is running on local machine
        video: false, // capture video for your test
        visual: false, // capture screenshots on each step
        network: false, // capture network logs for your test
        console: true, // capture browser console logs
        user: process.env.LT_USERNAME,
        accessKey: process.env.LT_ACCESS_KEY,
        pseudoActivityInterval: 15000 // 15000 ms heartbeat to avoid timeouts
      }
    }
  })
}
