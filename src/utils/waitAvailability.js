import timeout from 'timeout-then'

const waitAvailability = getter => {
  let tries = 0
  const checkAvailability = async () => {
    tries++
    tries % 10 === 0 && console.log(tries, 'tries', getter.toString())
    await timeout(100)
    if (getter()) {
      return
    } else if (tries > 1000) {
      throw new Error('not available after a while')
    } else {
      return checkAvailability()
    }
  }
  return checkAvailability()
}

export default waitAvailability
