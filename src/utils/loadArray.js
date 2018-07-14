export default db => async reducerName => {
  try {
    const res = await db.allDocs({ include_docs: true }) //TODO use reducer name as id prefix

    return res.rows.map(row => row.doc)
  } catch (err) {
    if (err.status === 404) {
      return []
    } else {
      console.error(err)
    }
  }
}
