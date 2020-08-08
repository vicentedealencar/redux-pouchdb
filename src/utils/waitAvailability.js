import timeout from 'timeout-then'
// import log from './log'

const waitAvailability = getter => {
  let tries = 0
  const checkAvailability = async () => {
    tries++
    await timeout(100)
    const x = getter()
    // tries % 10 === 0 && log(tries, 'tries', x, getter.toString())
    return x ? x : tries > 1000 ? null : checkAvailability()
  }
  return checkAvailability()
}

export default waitAvailability
