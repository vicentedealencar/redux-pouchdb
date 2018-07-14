import loadArray from './loadArray'
import { uniqOmittingDocProps, getDiff } from './ramdaUtils'

const unpersistedQueue = {}
let isUpdating = {}

export const isUpToDate = reducerName => {
  // console.log('isArrayUpToDate', !isUpdating[reducerName], unpersistedQueue[reducerName])
  return (
    console.log(
      !isUpdating[reducerName],
      !unpersistedQueue[reducerName] || !unpersistedQueue[reducerName].length
    ),
    !isUpdating[reducerName] &&
      (!unpersistedQueue[reducerName] || !unpersistedQueue[reducerName].length)
  )
}
export default (db, reducerName) => {
  const loadArrayReducer = loadArray(db)

  const saveReducer = async reducerState => {
    // console.log('save?', !isUpdating[reducerName], reducerState)
    if (isUpdating[reducerName]) {
      const docs = await loadArrayReducer(reducerName)
      const diff = getDiff(reducerState, docs)
      if (diff.length) {
        //enqueue promise
        unpersistedQueue[reducerName] = uniqOmittingDocProps(
          diff.concat(unpersistedQueue[reducerName])
        )
        // console.log(
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
        // console.log('not array', reducerState)
        throw new Error(`State of ${reducerName} must be an array`)
      }
      const docs = await loadArrayReducer(reducerName)
      // console.log('load to save docs', docs.length)

      const bulk = getDiff(reducerState, docs)

      // console.log(bulk.length, 'reducerState', reducerState, 'docs', docs)
      if (bulk.length) {
        // console.log('bulk', bulk)
        await db.bulkDocs(bulk)
      }

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
