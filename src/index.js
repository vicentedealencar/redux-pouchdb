import persistentArrayReducer, {
  isArrayUpToDate
} from './persistentArrayReducer'
import persistentObjectReducer, {
  isObjectUpToDate
} from './persistentObjectReducer'
import waitAvailability from './utils/waitAvailability'
import log from './utils/log'

let _store
const storeGetter = () => _store

export const waitSync = reducerName =>
  waitAvailability(() => {
    log(
      'waitSync',
      !!_store,
      !!isObjectUpToDate(reducerName),
      !!isArrayUpToDate(reducerName)
    )
    return (
      _store && isArrayUpToDate(reducerName) && isObjectUpToDate(reducerName)
    )
  })

export const persistStore = store => {
  _store = store
}

// Higher order reducer
export const persistentReducer = (db, reducerName, isArray) =>
  isArray
    ? persistentArrayReducer(storeGetter, db, reducerName)
    : persistentObjectReducer(storeGetter, db, reducerName)

export const persistentDocumentReducer = (db, reducerName) =>
  persistentObjectReducer(storeGetter, db, reducerName)

export const persistentCollectionReducer = (db, reducerName) =>
  persistentArrayReducer(storeGetter, db, reducerName)
