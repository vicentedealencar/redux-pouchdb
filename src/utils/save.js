import load from './load'

const unpersistedQueue = {}
const isUpdating = {}

export const isUpToDate = reducerName =>
  !isUpdating[reducerName] &&
  (!unpersistedQueue[reducerName] || !unpersistedQueue[reducerName].length)

export default (db, reducerName) => {
  const loadReducer = load(db)

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
      const doc = await loadReducer(reducerName)

      const newDoc = {
        ...doc
      }

      if (Array.isArray(reducerState)) {
        newDoc.state = [...(doc.state || []), ...reducerState]
      } else {
        newDoc.state = {
          ...doc.state,
          ...reducerState
        }
      }

      await db.put(newDoc)

      isUpdating[reducerName] = false
      if (unpersistedQueue[reducerName]) {
        const next = unpersistedQueue[reducerName].shift()

        return saveReducer(next)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return saveReducer
}
