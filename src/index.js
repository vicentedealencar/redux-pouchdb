import { equals } from 'ramda'
import waitAvailability from './utils/waitAvailability'
import save, { isUpToDate } from './utils/save'
import saveArray, { isArrayUpToDate } from './utils/saveArray'
import { equalsOmittingDocProps } from './utils/ramdaUtils'

export const SET_OBJECT_REDUCER = '@@redux-pouchdb/SET_OBJECT_REDUCER'
export const UPDATE_ARRAY_REDUCER = '@@redux-pouchdb/UPDATE_ARRAY_REDUCER'

let _store
let isInitialized = {}

export const waitInitialization = reducerName =>
  waitAvailability(
    () => (
      // console.log(
      //   '...',
      //   !!_store,
      //   !!isInitialized[reducerName],
      //   !!isUpToDate(reducerName),
      //   !!isArrayUpToDate(reducerName)
      // ),
      _store &&
        isInitialized[reducerName] &&
        isUpToDate(reducerName) &&
        isArrayUpToDate(reducerName)
    )
  )

export const waitPersistence = reducerName =>
  waitAvailability(
    () => isUpToDate(reducerName) && isArrayUpToDate(reducerName)
  )

export const persistStore = store => {
  _store = store
}
const updateArrayReducer = (store, doc, reducerName) => {
  // console.log('store.dispatch update array', JSON.stringify(doc, null, 2))
  store.dispatch({
    type: UPDATE_ARRAY_REDUCER,
    reducerName,
    doc
  })
}

const initializePersistentArrayReducer = async (
  db,
  reducerName,
  saveArrayReducer
) => {
  try {
    const store = await waitAvailability(() => _store)

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
      // console.log('change', change)
      if (change.doc) {
        // console.log('updateArrayReducer', change.doc)
        updateArrayReducer(store, change.doc, reducerName)
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

const setReducer = (store, doc, reducerName) => {
  const { _id, _rev, state } = doc
  // console.log('setReducer', doc)
  store.dispatch({
    type: SET_OBJECT_REDUCER,
    reducerName, //_id,
    state,
    _rev
  })
}

// service
const initializePersistentObjectReducer = async (
  db,
  reducerName,
  saveReducer
) => {
  try {
    const store = await waitAvailability(() => _store)
    // console.log('-----got store----')

    const res = await db.allDocs({ include_docs: true })
    await Promise.all(
      res.rows.map(row => setReducer(store, row.doc, reducerName))
    )
    // console.log('---dispatched docs------')

    db.changes({
      include_docs: true,
      live: true,
      since: 'now'
    }).on('change', change => {
      const storeState = store.getState()

      // console.log('doc change', change)

      if (change.doc.state) {
        if (!equals(change.doc.state, storeState)) {
          setReducer(store, change.doc, reducerName)
        }
      } else {
        saveReducer(store.getState())
      }
    })
  } catch (err) {
    console.error(err)
  }

  isInitialized[reducerName] = true
  // console.log('-----inited----')
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
      action.reducerName === reducerName &&
      action.doc
    ) {
      // console.log('action', action)
      lastState = state.map(item => {
        if (
          equalsOmittingDocProps(item, action.doc) ||
          item._id === action.doc._id
        ) {
          return action.doc
        }

        return item
      })

      return reducer(lastState, action)
    }

    const reducedState = reducer(state, action)

    const init = async () => {
      const success = await waitInitialization(reducerName)

      if (success && !equals(reducedState, lastState)) {
        lastState = reducedState
        saveArrayReducer(reducedState)
      }
    }
    init()
    // console.log('lastState', lastState, 'reducedState', reducedState)

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
    // console.log('reducer', action.type, state)
    if (
      action.type === SET_OBJECT_REDUCER &&
      action.reducerName === reducerName &&
      action.state
    ) {
      lastState = action.state
      return reducer(action.state, action)
    }

    const reducedState = reducer(state, action)

    // console.log(
    //   'save?',
    //   isInitialized[reducerName],
    //   !equals(reducedState, lastState),
    //   reducedState
    // )
    if (!equals(reducedState, lastState)) {
      lastState = reducedState
      saveReducer(reducedState)
    }

    return reducedState
  }
}
