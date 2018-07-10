import equal from 'deep-equal'
import loadArray from './loadArray'

const unpersistedQueue = {}
let isUpdating = {}

export const isArrayUpToDate = reducerName => {
  // console.log('isArrayUpToDate', !isUpdating[reducerName], unpersistedQueue[reducerName])
  return !isUpdating[reducerName] &&
  (!unpersistedQueue[reducerName] || !unpersistedQueue[reducerName].length)
}
export default (db, reducerName) => {
  const loadArrayReducer = loadArray(db)

  const saveReducer = async reducerState => {
    // console.log('save?', !isUpdating[reducerName], reducerState)
    if (isUpdating[reducerName]) {
      //enqueue promise
      unpersistedQueue[reducerName] = (
        unpersistedQueue[reducerName] || []
      ).concat(reducerState)

      return
    }

    isUpdating[reducerName] = true

    try {
      if (!Array.isArray(reducerState)) {
        // console.log('not array', reducerState)
        throw new Error(`State of ${reducerName} must be an array`)
      }
      const docs = await loadArrayReducer(reducerName)
      // console.log('load to save docs', docs)

      const newDocs = reducerState
        .map(item => {
          const same = docs.filter(({ _id, _rev, _deleted, ...doc }) =>
            equal(item, doc)
          )
          return same[0]
            ? null // ignore unchanged docs
            : docs.some(({ _id }) => _id === item._id)
              ? { ...docs.filter(({ _id }) => _id === item._id)[0], ...item } // update altered docs
              : item // insert new docs
        })
        .filter(x => x)

      if (newDocs.length) {
        // console.log('saving docs', newDocs)
        await db.bulkDocs(newDocs)
      }
      // await Promise.all(
      //   newDocs.map(async newDoc => {
      //     const method = newDoc._id ? 'put' : 'post'
      //     console.log(method, newDoc)
      //     return await db[method](newDoc)
      //       .then(function(response) {
      //         console.log('ok', response.ok)
      //       })
      //       .catch(function(err) {
      //         console.log('err', err)
      //       })
      //   })
      // )
      // console.log('unpersistedQueue', unpersistedQueue[reducerName])
      // TODO
      // delete removed docs

      // console.log('IS UP TO DATE', reducerName, isArrayUpToDate(reducerName))
      isUpdating[reducerName] = false

      if (unpersistedQueue[reducerName]) {
        const next = unpersistedQueue[reducerName]
        unpersistedQueue[reducerName] = null

        return saveReducer(next)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return saveReducer
}
