import timeout from 'timeout-then'

const waitAvailability = getter => {
  let tries = 0
  const checkAvailability = async () => {
    tries++
    await timeout(100)
    const x = getter()
    return x ? x : tries > 1000 ? null : checkAvailability()
    // tries % 10 === 0 && console.log(tries, 'tries', getter.toString(), x)
  }
  return checkAvailability()
}

export default waitAvailability
