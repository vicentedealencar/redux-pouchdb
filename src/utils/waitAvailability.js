import timeout from 'timeout-then'

const waitAvailability = getter => {
  let tries = 0
  const checkAvailability = async () => {
    tries++
    await timeout(100)
    const x = getter()
    // tries % 10 === 0 && console.log(tries, 'tries', x, getter.toString())
    return x ? x : tries > 1000 ? null : checkAvailability()
  }
  return checkAvailability()
}

export default waitAvailability
