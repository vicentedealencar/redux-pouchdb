import { equals } from 'ramda'
import save, { isUpToDate } from './utils/save'
import waitAvailability from './utils/waitAvailability'

export const SET_OBJECT_REDUCER = '@@redux-pouchdb/SET_OBJECT_REDUCER'

let initialized = {}
let running = {}

const isRunning = reducerName =>
  running[reducerName] !== undefined && running[reducerName] > 0

const isInitialized = reducerName =>
  initialized[reducerName] !== false

export const isObjectUpToDate = reducerName => (
  // console.log(
  //   'isObjectUpToDate',
  //   initialized[reducerName],
  //   isUpToDate(reducerName),
  //   !isRunning(reducerName)
  // ),
  isInitialized(reducerName) && isUpToDate(reducerName) && !isRunning(reducerName)
)

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
  storeGetter,
  db,
  reducerName,
  saveReducer
) => {
  try {
    const store = await waitAvailability(storeGetter)
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

  initialized[reducerName] = true
  // console.log('-----inited----')
}

// Higher order reducer
const persistentObjectReducer = (storeGetter, db, reducerName) => reducer => {
  let lastState
  initialized[reducerName] = false
  const saveReducer = save(db, reducerName)

  initializePersistentObjectReducer(storeGetter, db, reducerName, saveReducer)

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
    const init = async () => {
      if (!running[reducerName]) running[reducerName] = 0

      running[reducerName] += 1

      if (!equals(reducedState, lastState)) {
        lastState = reducedState
        await saveReducer(reducedState)
      }

      running[reducerName] -= 1
    }
    init()

    return reducedState
  }
}

export default persistentObjectReducer
