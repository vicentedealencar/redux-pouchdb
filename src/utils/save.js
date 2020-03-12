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
      // const newDoc = {
      //   ...doc
      // }

      // if (Array.isArray(reducerState)) {
      //   newDoc.state = [...(doc.state || []), ...reducerState]
      // } else {
      //   newDoc.state = {
      //     ...doc.state,
      //     ...reducerState
      //   }
      // }
      log(
        'put',
        newDoc,
        isUpdating[reducerName],
        unpersistedQueue[reducerName],
        typeof unpersistedQueue[reducerName]
        // Object.keys(unpersistedQueue[reducerName]),
        // unpersistedQueue[reducerName].lenght
      )
      await db.put(newDoc)

      isUpdating[reducerName] = false
      if (
        unpersistedQueue[reducerName] &&
        unpersistedQueue[reducerName].length
      ) {
        const next = unpersistedQueue[reducerName].shift()
        log('next', next)
        return await saveReducer(next)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return saveReducer
}
