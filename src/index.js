import { omit } from 'ramda'
import equal from 'deep-equal'
import 'array.from'
import waitAvailability from './utils/waitAvailability'
import save, { isUpToDate } from './utils/save'
import saveArray, { isArrayUpToDate } from './utils/saveArray'

export const SET_OBJECT_REDUCER = '@@redux-pouchdb/SET_OBJECT_REDUCER'
export const UPDATE_ARRAY_REDUCER = '@@redux-pouchdb/UPDATE_ARRAY_REDUCER'
export const INIT = '@@redux-pouchdb/INIT'

let store
let isInitialized = {}

export const waitInitialization = reducerName =>
  waitAvailability(
    () =>
      store &&
      isInitialized[reducerName] &&
      isUpToDate(reducerName) &&
      isArrayUpToDate(reducerName)
  )

export const waitPersistence = reducerName =>
  waitAvailability(
    () => isUpToDate(reducerName) && isArrayUpToDate(reducerName)
  )

// Store enhancer
export const persistentStore = storeCreator => (reducer, initialState) => {
  store = storeCreator(reducer, initialState)

  return store
}

//service
const initializePersistentArrayReducer = async (
  db,
  reducerName,
  saveArrayReducer
) => {
  const updateArrayReducer = doc => {
    // console.log('store.dispatch update array', JSON.stringify(doc, null, 2))
    store.dispatch({
      type: UPDATE_ARRAY_REDUCER,
      reducer: reducerName,
      doc
    })
  }

  try {
    await waitAvailability(() => store)

    const res = await db.allDocs({ include_docs: true })
    await Promise.all(res.rows.map(row => updateArrayReducer(row.doc)))

    store.dispatch({
      type: INIT,
      reducerName
    })

    db.changes({
      include_docs: true,
      live: true,
      since: 'now'
    }).on('change', change => {
      // console.log('change', change)
      if (change.doc) {
        // console.log('updateArrayReducer', change.doc)
        updateArrayReducer(change.doc)
      } else {
        // console.log('saveArrayReducer', store.getState())
        saveArrayReducer(store.getState())
      }
    })
  } catch (err) {
    console.error(err)
  }

  isInitialized[reducerName] = true
}

// service
const initializePersistentObjectReducer = async (
  db,
  reducerName,
  saveReducer
) => {
  const setReducer = doc => {
    const { _id, _rev, state } = doc
    // console.log('setReducer', doc)
    store.dispatch({
      type: SET_OBJECT_REDUCER,
      reducer: reducerName, //_id,
      state,
      _rev
    })
  }

  try {
    const res = await db.allDocs({ include_docs: true })

    await waitAvailability(() => store)

    await Promise.all(res.rows.map(row => setReducer(row.doc)))

    isInitialized[reducerName] = true
    store.dispatch({
      type: INIT,
      reducerName
    })

    db.changes({
      include_docs: true,
      live: true,
      since: 'now'
    }).on('change', change => {
      const storeState = store.getState()

      // console.log('doc change', change)

      if (change.doc.state) {
        if (!equal(change.doc.state, storeState)) {
          setReducer(change.doc)
        }
      } else {
        saveReducer(store.getState())
      }
    })
  } catch (err) {
    console.error(err)
  }
}

// Higher order reducer
export const persistentReducer = (db, reducerName, isArray) =>
  isArray
    ? persistentArrayReducer(db, reducerName)
    : persistentObjectReducer(db, reducerName)

// Higher order reducer
const persistentArrayReducer = (db, reducerName) => reducer => {
  let lastState
  isInitialized[reducerName] = false
  const saveArrayReducer = saveArray(db, reducerName)

  initializePersistentArrayReducer(db, reducerName, saveArrayReducer)

  return (state, action) => {
    // console.log('reducer', action.type, state)
    if (
      action.type === UPDATE_ARRAY_REDUCER &&
      action.reducer === reducerName &&
      action.doc
    ) {
      const omitDocProps = omit(['_id', '_rev', '_deleted'])
      // console.log('action', action)
      lastState = state.map(item => {
        if (
          equal(item, omitDocProps(action.doc)) ||
          equal(item._id, action.doc._id)
        ) {
          return action.doc
        }

        return item
      })

      return reducer(lastState, action)
    }

    const reducedState = reducer(state, action)

    // console.log('lastState', lastState, 'reducedState', reducedState)
    waitInitialization(reducerName).then(() => {
      // console.log(
      //   'will save',
      //   isInitialized[reducerName],
      //   !equal(reducedState, lastState)
      // )
      if (isInitialized[reducerName] && !equal(reducedState, lastState)) {
        lastState = reducedState
        saveArrayReducer(reducedState)
      }
    })

    return reducedState
  }
}

// Higher order reducer
const persistentObjectReducer = (db, reducerName) => reducer => {
  let lastState
  isInitialized[reducerName] = false
  const saveReducer = save(db, reducerName)

  initializePersistentObjectReducer(db, reducerName, saveReducer)

  return (state, action) => {
    if (
      action.type === SET_OBJECT_REDUCER &&
      action.reducer === reducerName &&
      action.state
    ) {
      lastState = action.state
      return reducer(action.state, action)
    }

    const reducedState = reducer(state, action)

    if (isInitialized[reducerName] && !equal(reducedState, lastState)) {
      lastState = reducedState
      saveReducer(reducedState)
    }

    return reducedState
  }
}
