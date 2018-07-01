import equal from 'deep-equal'
import 'array.from'
import timeout from 'timeout-then'
import save from './save'
import saveArray from './saveArray'

export const SET_OBJECT_REDUCER = '@@redux-pouchdb/SET_OBJECT_REDUCER'
export const UPDATE_ARRAY_REDUCER = '@@redux-pouchdb/UPDATE_ARRAY_REDUCER'
export const INIT = '@@redux-pouchdb/INIT'

let store
let isInitialized = {}
export const persistentStore = storeCreator => (reducer, initialState) => {
  store = storeCreator(reducer, initialState)

  return store
}

const waitStore = () => {
  let tries = 0
  const checkStore = async () => {
    tries++
    if (store) {
      return
    } else if (tries > 1000) {
      throw new Error('no store after a while')
    } else {
      await timeout(100)
      return checkStore()
    }
  }
  return checkStore()
}

const initializePersistentArrayReducer = async (
  db,
  reducerName,
  saveArrayReducer
) => {
  const updateArrayReducer = doc => {
    store.dispatch({
      type: UPDATE_ARRAY_REDUCER,
      reducer: reducerName,
      doc
    })
  }

  try {
    isInitialized[reducerName] = true

    await waitStore()

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
      if (change.doc.state) {
        updateArrayReducer(change.doc)
      } else {
        saveArrayReducer(store.getState())
      }
    })
  } catch (err) {
    console.error(err)
  }
}

const initializePersistentObjectReducer = async (
  db,
  reducerName,
  saveReducer
) => {
  const setReducer = doc => {
    const { _id, _rev, state } = doc

    store.dispatch({
      type: SET_OBJECT_REDUCER,
      reducer: reducerName, //_id,
      state,
      _rev
    })
  }

  try {
    const res = await db.allDocs({ include_docs: true })

    isInitialized[reducerName] = true

    await Promise.all(res.rows.map(row => setReducer(row.doc)))

    await waitStore()

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

export const persistentReducer = (db, reducerName, isArray) =>
  isArray
    ? persistentArrayReducer(db, reducerName)
    : persistentObjectReducer(db, reducerName)

const persistentArrayReducer = (db, reducerName) => reducer => {
  let lastState
  isInitialized[reducerName] = false
  const saveArrayReducer = saveArray(db, reducerName)

  initializePersistentArrayReducer(db, reducerName, saveArrayReducer)

  return (state, action) => {
    if (
      action.type === UPDATE_ARRAY_REDUCER &&
      action.reducer === reducerName &&
      action.doc
    ) {
      const { _id, _rev, _deleted, ...cleanDoc } = action.doc

      lastState = state.map(item => {
        if (equal(item, cleanDoc.state) || equal(item._id, _id)) {
          return action.doc
        }

        return item
      })

      return reducer(lastState, action)
    }

    const reducedState = reducer(state, action)

    if (isInitialized[reducerName] && !equal(reducedState, lastState)) {
      lastState = reducedState
      saveArrayReducer(reducedState)
    }

    return reducedState
  }
}

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
