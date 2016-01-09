export default (...objs) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...objs);
  }
}
