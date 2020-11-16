import load from './load'
import log from './log'

const unpersistedQueue = {}
const isUpdating = {}

export const isUpToDate = reducerName =>
  !isUpdating[reducerName] &&
  (!unpersistedQueue[reducerName] || !unpersistedQueue[reducerName].length)

export default (db, reducerName, madeBy) => {
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

      const newDoc = { ...doc, madeBy, state: reducerState }

      log(
        'put',
        newDoc,
        isUpdating[reducerName],
        unpersistedQueue[reducerName],
        typeof unpersistedQueue[reducerName]
      )
      await db.put(newDoc)

      isUpdating[reducerName] = false
      if (
        unpersistedQueue[reducerName] &&
        unpersistedQueue[reducerName].length
      ) {
        const next = unpersistedQueue[reducerName].shift()
        await saveReducer(next)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return saveReducer
}
