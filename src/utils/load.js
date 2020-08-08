export default db => async _id => {
  try {
    return await db.get(_id)
  } catch (err) {
    if (err.status === 404) {
      return { _id: _id, state: {} }
    } else {
      console.error(err)
    }
  }
}
