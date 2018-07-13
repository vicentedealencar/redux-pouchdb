import { equals } from 'ramda'
import persistentArrayReducer, {
  isArrayUpToDate
} from './persistentArrayReducer'
import persistentObjectReducer, {
  isObjectUpToDate
} from './persistentObjectReducer'
import waitAvailability from './utils/waitAvailability'

let _store

export const waitSync = reducerName =>
  waitAvailability(
    () =>
      // console.log(
      //   'waitSync',
      //   !!_store,
      //   !!isObjectUpToDate(reducerName),
      //   !!isArrayUpToDate(reducerName)
      // ),
    _store && isArrayUpToDate(reducerName) && isObjectUpToDate(reducerName)
  )

export const persistStore = store => {
  _store = store
}

// Higher order reducer
export const persistentReducer = (db, reducerName, isArray) =>
  isArray
    ? persistentArrayReducer(() => _store, db, reducerName)
    : persistentObjectReducer(() => _store, db, reducerName)
