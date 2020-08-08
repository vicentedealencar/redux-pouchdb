import 'should'
import { createStore } from 'redux'
import PouchDB from 'pouchdb'
import {
  persistStore,
  persistentCollectionReducer,
  waitSync
} from '../src/index'
import loadArray from '../src/utils/loadArray'

describe('redux-pouchdb array', () => {
  const db = new PouchDB('app', { db: require('memdown') })

  const UPDATE_PROP = 'UPDATE_PROP'
  const DELETE_PROP = 'DELETE_PROP'

  const reducer = (state = [{ x: 0 }, { x: 1 }, { x: 2 }], action) => {
    const { index, key, value } = action.payload || {}
    switch (action.type) {
      case UPDATE_PROP:
        return state.map((item, i) =>
          i !== index ? item : { ...item, [key]: value }
        )
      case DELETE_PROP:
        return state.map((item, i) => {
          if (i !== index) {
            return item
          }
          const updatedItem = { ...item }
          delete updatedItem[key]
          return updatedItem
        })
      default:
        return state
    }
  }
  const reducerName = 'counters'
  const finalReducer = persistentCollectionReducer(db, reducerName)(reducer)

  it('should persist store state as array and update', async done => {
    let store = createStore(finalReducer)
    persistStore(store)

    const success = await waitSync(reducerName)
    success.should.be.equal(true)

    const payload = {
      index: 0,
      key: 'x',
      value: -1
    }
    store.dispatch({
      type: UPDATE_PROP,
      payload
    })

    await waitSync(reducerName)

    const docs = await loadArray(db)(reducerName)
    const storeState = store.getState()

    const x2a = storeState
      .map(a => a.x)
      .sort()
      .join()
    const x2b = docs
      .map(a => a.x)
      .sort()
      .join()

    x2a.should.be.equal(x2b)

    storeState[payload.index][payload.key].should.be.equal(payload.value)
    // console.log(storeState)
    // console.log(docs)
    docs
      .filter(doc => doc._id === storeState[payload.index]._id)[0]
      [payload.key].should.be.equal(payload.value)

    done()
  })
})
