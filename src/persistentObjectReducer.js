import { equalsOmittingDocProps } from './utils/ramdaUtils'
import save, { isUpToDate } from './utils/save'
import waitAvailability from './utils/waitAvailability'
import log from './utils/log'

export const SET_OBJECT_REDUCER = '@@redux-pouchdb/SET_OBJECT_REDUCER'
export const INIT_OBJECT_REDUCER = '@@redux-pouchdb/INIT_OBJECT_REDUCER'

const LOCAL_IDENTIFIER = Array(12)
  .fill(0)
  .map(_ =>
    String.fromCharCode(
      (x => (x > 25 ? x + 71 : x + 65))(Math.floor(Math.random() * 52))
    )
  )
  .join('')

let initialized = {}
let running = {}
const dispatched = {}

const isRunning = reducerName =>
  running[reducerName] !== undefined && running[reducerName] > 0

const isInitialized = reducerName => initialized[reducerName] !== false

export const isObjectUpToDate = reducerName =>
  // log(
  //   'isObjectUpToDate',
  //   initialized[reducerName],
  //   isUpToDate(reducerName),
  //   !isRunning(reducerName)
  // ),
  isInitialized(reducerName) &&
  isUpToDate(reducerName) &&
  !isRunning(reducerName)

const setReducer = (store, doc, reducerName) => {
  const { _id, _rev, state } = doc
  // log('setReducer', doc)
  if (_id === reducerName) {
    store.dispatch({
      type: SET_OBJECT_REDUCER,
      reducerName, //_id,
      state,
      _rev
    })
  }
}

// service
const initializePersistentObjectReducer = async (
  storeGetter,
  db,
  reducerName,
) => {
  try {
    const store = await waitAvailability(storeGetter)
    if (dispatched[reducerName]) {
      return
    }
    dispatched[reducerName] = true
    // log('-----got store----')

    try{
      const res = await db.get(reducerName)
      setReducer(store, res, reducerName)
    } catch(err){
      console.error(err);
    }
    // log('---dispatched docs------')

    initialized[reducerName] = true
    store.dispatch({
      type: INIT_OBJECT_REDUCER,
    })
    // log('-----inited----')
  } catch (err) {
    console.error(err)
  }
}

const eventsListenerFactory = (db, reducerActions = {}) => {
  db.changes({
    include_docs: true,
    live: true,
    since: 'now',
  }).on('change', (change) => {
    // if (change.doc.state && change.doc.madeBy !== LOCAL_IDENTIFIER) {
    //   setReducer(change.doc)
    // }
    if (!reducerActions[change.doc._id]) {
      throw new Error(`${change.doc._id} must be subscribed to listener`)
    }
    const [storeGetter, saveReducer] = reducerActions[change.doc._id]

    const store = storeGetter()


    const storeState = store.getState()
    // log('doc change', JSON.stringify(change))

    if (change.doc.state) {
      // log(
      // !equalsOmittingDocProps(change.doc.state, storeState)
      // JSON.stringify(change.doc.state, null, 2),
      // JSON.stringify(storeState, null, 2)
      // )
      if (
        !equalsOmittingDocProps(change.doc.state, storeState) &&
        change.doc.madeBy !== LOCAL_IDENTIFIER
      ) {
        setReducer(store, change.doc, change.doc._id)
      }
    } else {
      log(0)

      saveReducer(store.getState())
    }
  })

  return (reducerName, storeGetter, saveReducer) => {
    reducerActions[reducerName] = [storeGetter, saveReducer]
  }
}

let eventsListener

// Higher order reducer
const persistentObjectReducer = (storeGetter, db, reducerName) => (reducer) => {
  let lastState
  initialized[reducerName] = false
  const saveReducer = save(db, reducerName, LOCAL_IDENTIFIER)

  initializePersistentObjectReducer(storeGetter, db, reducerName, saveReducer)

  if (!eventsListener) {
    eventsListener = eventsListenerFactory(db)
  }

  eventsListener(reducerName, storeGetter, saveReducer)

  return (state, action) => {
    // log('reducer', action.type, state)
    if (
      action.type === SET_OBJECT_REDUCER &&
      action.reducerName === reducerName &&
      action.state
    ) {
      lastState = action.state
      return reducer(action.state, action)
    }
    if (action.type === SET_OBJECT_REDUCER) {
      // Another reducer's state... ignore.
      return state
    }

    const reducedState = reducer(state, action)

    const init = async () => {
      if (!running[reducerName]) running[reducerName] = 0

      running[reducerName] += 1

      // log(
      //   'save?',
      //   isInitialized(reducerName),
      //   !equalsOmittingDocProps(reducedState, lastState),
      //   reducedState,
      // )
      if (!equalsOmittingDocProps(reducedState, lastState)) {
        if (isInitialized(reducerName)) {
          lastState = reducedState
          await saveReducer(reducedState)
        }
      }

      running[reducerName] -= 1
    }
    init()

    return reducedState
  }
}

export default persistentObjectReducer
