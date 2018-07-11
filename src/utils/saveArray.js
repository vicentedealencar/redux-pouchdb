import equal from 'deep-equal'
import {
  uniqWith,
  omit,
  without,
  intersection,
  differenceWith,
  flatten
} from 'ramda'
import loadArray from './loadArray'

const unpersistedQueue = {}
let isUpdating = {}

const omitDocProps = omit(['_id', '_rev', '_deleted'])
const equalsOmittingDocProps = (curr, old) =>
  equal(omitDocProps(curr), omitDocProps(old))
// const isSame = (a, b) =>
// a === b ||
// equal(a, b) ||
// (a && b && ((a._id && b._id && a._id === b._id) ||
//   omitDocProps(a) === omitDocProps(b)))
const uniq = uniqWith(equalsOmittingDocProps)
// const getInsertedItems = differenceWith(isSame)
// const getUpdatedItems = (curr, old) => without(omitDocProps(curr),
//   intersection(
//     omitDocProps(curr),
//     omitDocProps(old)))//.map(newDoc => )
// const getDeletedItems = (curr, old) => differenceWith(isSame, old, curr)
// const getDifference = (curr, old) => flatten(
//   getInsertedItems(curr, old),
//   // getUpdatedItems(curr,old)
// )
const differenceOmittingDocProps = differenceWith(equalsOmittingDocProps)

export const isArrayUpToDate = reducerName => {
  // console.log('isArrayUpToDate', !isUpdating[reducerName], unpersistedQueue[reducerName])
  return (
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
      const diff = differenceOmittingDocProps(reducerState, docs)
      if (diff.length) {
        //enqueue promise
        unpersistedQueue[reducerName] = uniq(
          diff.concat(unpersistedQueue[reducerName])
        )
        console.log(
          'enqueue',
          unpersistedQueue[reducerName].length,
          unpersistedQueue[reducerName]
        )
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

      const bulk = differenceOmittingDocProps(reducerState, docs)
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
