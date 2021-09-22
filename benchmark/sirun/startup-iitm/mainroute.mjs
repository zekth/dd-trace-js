const { searchParams } = new URL(import.meta.url)
const count = Number(searchParams.get('c')) + 1

let def

export { def as default }

if (count < 100) {
  def = (await import('./mainroute.mjs?c=' + count)).default
} else {
  def = function (req, res) {
    res.end('hello, world')
  }
}
