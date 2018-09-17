import loadArray from './loadArray'
import { uniqOmittingDocProps, getDiff } from './ramdaUtils'
import log from './log'

const unpersistedQueue = {}
let isUpdating = {}
let waitingChanges = {}

export const isUpToDate = reducerName => {
  // log('isUpToDate', !isUpdating[reducerName], unpersistedQueue[reducerName])
  // log(isUpdating, unpersistedQueue, waitingChanges, reducerName)

  return (
    (isUpdating[reducerName] === undefined || !isUpdating[reducerName]) &&
    (unpersistedQueue[reducerName] === undefined ||
      !unpersistedQueue[reducerName]) &&
    !waitingChanges[reducerName]
  )
}
export default (db, reducerName) => {
  const loadArrayReducer = loadArray(db)

  const saveReducer = async reducerState => {
    // log('save?', !isUpdating[reducerName], reducerState)
    if (isUpdating[reducerName]) {
      const docs = await loadArrayReducer(reducerName)
      const diff = getDiff(reducerState, docs)
      if (diff.length) {
        //enqueue promise
        unpersistedQueue[reducerName] = uniqOmittingDocProps(
          diff.concat(unpersistedQueue[reducerName])
        )
        // log(
        //   'enqueue',
        //   unpersistedQueue[reducerName].length,
        //   unpersistedQueue[reducerName]
        // )
      }

      return
    }

    isUpdating[reducerName] = true

    try {
      if (!Array.isArray(reducerState)) {
        // log('not array', reducerState)
        throw new Error(`State of ${reducerName} must be an array`)
      }
      const docs = await loadArrayReducer(reducerName)
      // log('load to save docs', docs.length)

      const bulk = getDiff(reducerState, docs)

      // log(bulk.length, 'reducerState', reducerState, 'docs', docs)
      if (bulk.length) {
        if (!waitingChanges[reducerName]) waitingChanges[reducerName] = 0
        waitingChanges[reducerName] += 1

        // log('bulk', bulk, 'waitingChanges', waitingChanges)
        await db.bulkDocs(bulk)
        waitingChanges[reducerName] -= 1
      }

      // log('IS UP TO DATE', reducerName, isUpToDate(reducerName))
      isUpdating[reducerName] = false

      if (unpersistedQueue[reducerName]) {
        const next = unpersistedQueue[reducerName]
        unpersistedQueue[reducerName] = null

        return await saveReducer(next)
      }
    } catch (error) {
      console.error(error)
    }
  }

  return saveReducer
}
