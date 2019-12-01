import saveArray, { isUpToDate } from './utils/saveArray'
import { equalsOmittingDocProps } from './utils/ramdaUtils'
import waitAvailability from './utils/waitAvailability'
import log from './utils/log'

export const UPDATE_ARRAY_REDUCER = '@@redux-pouchdb/UPDATE_ARRAY_REDUCER'
export const REMOVE_ARRAY_REDUCER = '@@redux-pouchdb/REMOVE_ARRAY_REDUCER'

let initialized = {}
let running = {}

const isRunning = reducerName =>
  running[reducerName] !== undefined && running[reducerName] > 0

const isInitialized = reducerName => initialized[reducerName] !== false

export const isArrayUpToDate = reducerName => {
  // log(
  //   'isArrayUpToDate',
  //   isInitialized(reducerName),
  //   isUpToDate(reducerName),
  //   !isRunning(reducerName)
  // )

  return (
    isInitialized(reducerName) &&
    isUpToDate(reducerName) &&
    !isRunning(reducerName)
  )
}

const updateArrayReducer = (store, doc, reducerName) => {
  // log('store.dispatch update array', JSON.stringify(doc, null, 2))
  return store.dispatch({
    type: UPDATE_ARRAY_REDUCER,
    reducerName,
    doc
  })
}

const removeArrayReducer = (store, doc, reducerName) => {
  // log('store.dispatch remove array', JSON.stringify(doc, null, 2))
  return store.dispatch({
    type: REMOVE_ARRAY_REDUCER,
    reducerName,
    doc
  })
}

const initializePersistentArrayReducer = async (
  storeGetter,
  db,
  reducerName,
  saveArrayReducer
) => {
  try {
    const store = await waitAvailability(storeGetter)

    // dispatch updates
    const res = await db.allDocs({ include_docs: true })
    await Promise.all(
      res.rows.map(row => updateArrayReducer(store, row.doc, reducerName))
    )

    db.changes({
      include_docs: true,
      live: true,
      since: 'now'
    }).on('change', change => {
      // log('change', change)
      if (change.doc) {
        // log('updateArrayReducer', change.doc)
        change.doc._deleted
          ? removeArrayReducer(store, change.doc, reducerName)
          : updateArrayReducer(store, change.doc, reducerName)
      } else {
        // log('saveArrayReducer', store.getState())
        saveArrayReducer(store.getState())
      }
    })
  } catch (err) {
    console.error(err)
  }

  initialized[reducerName] = true
}
// Higher order reducer
const persistentArrayReducer = (storeGetter, db, reducerName) => reducer => {
  let lastState
  initialized[reducerName] = false
  const saveArrayReducer = saveArray(db, reducerName)
  // log(storeGetter.toString())
  initializePersistentArrayReducer(
    storeGetter,
    db,
    reducerName,
    saveArrayReducer
  )

  return (state, action) => {
    // log('reducer', action.type, state)
    if (
      action.type === UPDATE_ARRAY_REDUCER &&
      action.reducerName === reducerName &&
      action.doc
    ) {
      // log('action', action)
      let found = false

      lastState = state.map(item => {
        if (
          equalsOmittingDocProps(item, action.doc) ||
          item._id === action.doc._id
        ) {
          found = true
          return action.doc
        }

        return item
      })

      if (!found) {
        lastState.push(action.doc)
      }

      return reducer(lastState, action)
    } else if (
      action.type === REMOVE_ARRAY_REDUCER &&
      action.reducerName === reducerName &&
      action.doc
    ) {
      lastState = state.filter(item => {
        return (
          !equalsOmittingDocProps(item, action.doc) &&
          item._id !== action.doc._id
        )
      })
      return reducer(lastState, action)
    }

    const reducedState = reducer(state, action)

    const init = async () => {
      if (!running[reducerName]) running[reducerName] = 0

      running[reducerName] += 1

      if (
        isInitialized(reducerName) &&
        !equalsOmittingDocProps(reducedState, lastState)
      ) {
        lastState = reducedState
        await saveArrayReducer(reducedState)
      }

      running[reducerName] -= 1
    }
    init()
    // log('lastState', lastState, 'reducedState', reducedState)

    return reducedState
  }
}

export default persistentArrayReducer
