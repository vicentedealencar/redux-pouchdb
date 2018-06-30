import equal from 'deep-equal'
import 'array.from'
import timeout from 'timeout-then'
import save from './save'

export const SET_REDUCER = 'redux-pouchdb/SET_REDUCER'
export const INIT = '@@redux-pouchdb/INIT'

let store
let isInitialized = {}
export const persistentStore = storeCreator => (reducer, initialState) => {
  store = storeCreator(reducer, initialState)

  return store
}

const createReducerSetter = reducerName => doc => {
  const { _id, _rev, state } = doc

  store.dispatch({
    type: SET_REDUCER,
    reducer: reducerName, //_id,
    state,
    _rev
  })
}

const initializePersistentReducer = async (db, reducerName) => {
  const setReducer = createReducerSetter(reducerName)

  try {
    const res = await db.allDocs({ include_docs: true })

    isInitialized[reducerName] = true

    await Promise.all(res.rows.map(row => setReducer(row.doc)))

    let tries = 0
    const waitStore = async () => {
      tries++
      if (store) {
        return
      } else if (tries > 100) {
        throw new Error('no store after a while')
      } else {
        await timeout(100)
        return waitStore()
      }
    }

    await waitStore()

    store.dispatch({
      type: INIT
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

export const persistentReducer = (db, reducerName) => reducer => {
  let lastState

  const saveReducer = save(db, reducerName)

  initializePersistentReducer(db, reducerName)

  return (state, action) => {
    if (
      action.type === SET_REDUCER &&
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
