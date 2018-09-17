export default (...args) =>
  // true || // quiet
  process.env.NODE_ENV === 'production' ? () => {} : console.log(...args)
