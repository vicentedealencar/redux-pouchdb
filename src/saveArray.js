import equal from 'deep-equal'
import loadArray from './loadArray'

const unpersistedQueue = {}
let isUpdating = {}

export default (db, reducerName) => {
  const loadArrayReducer = loadArray(db)

  const saveReducer = async reducerState => {
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
        throw new Error(`State of ${reducerName} must be an array`)
      }
      const docs = await loadArrayReducer(reducerName)

      const newDocs = reducerState
        .map(
          item =>
            docs.filter(({ _id, _rev, _deleted, ...doc }) =>
              equal(item, doc)
            )[0]
              ? null // ignore unchanged docs
              : docs.some(({ _id }) => _id === item._id)
                ? { ...docs.filter(({ _id }) => _id === item._id)[0], ...item } // update altered docs
                : item // insert new docs
        )
        .filter(x => x)
      await Promise.all(
        newDocs.map(doc => (doc._id ? db.put(doc) : db.post(doc)))
      )
      // TODO
      // delete removed docs

      if (unpersistedQueue[reducerName]) {
        const next = unpersistedQueue[reducerName].shift()

        return saveReducer(next)
      }

      isUpdating[reducerName] = false
    } catch (error) {
      console.error(error)
    }
  }

  return saveReducer
}
