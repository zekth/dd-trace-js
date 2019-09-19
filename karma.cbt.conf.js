const base = require('./karma.conf')

module.exports = config => {
  base(config)

  config.set({
    reporters: ['progress', 'CrossBrowserTesting'],

    browsers: ['mac1014_chrome76'],

    // https://www.npmjs.com/package/karma-cbt-launcher
    cbtConfig: {
      username: process.env.CBT_USERNAME,
      authkey: process.env.CBT_AUTHKEY
    },

    // https://crossbrowsertesting.com/api/v3/selenium/browsers
    customLaunchers: {
      mac1014_chrome76: {
        base: 'CrossBrowserTesting',
        browserName: 'mac1014_chrome76',
        browser_api_name: 'Chrome76x64',
        os_api_name: 'Mac10.14'
      }
    }
  })
}
