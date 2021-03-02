const http = require('http')

http.get('http://hello-world-service:8080/', res => {
  if (res.statusCode !== 200) {
    throw new Error(res.statusCode)
  }
})
