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

  const INCREMENT = 'INCREMENT'
  const DECREMENT = 'DECREMENT'

  const reducer = (state = [{ x: 0 }, { x: 1 }, { x: 2 }], action) => {
    switch (action.type) {
      case INCREMENT:
        return state.concat({ x: state.length })
      case DECREMENT:
        return !state.length ? state : state.slice(0, state.length - 1)
      default:
        return state
    }
  }
  const reducerName = 'counters'
  const finalReducer = persistentCollectionReducer(db, reducerName)(reducer)

  it('should persist store state as array and insert', async done => {
    // console.log('--go---')
    let store = createStore(finalReducer)
    persistStore(store)
    // console.log('--persisted---')

    const success = await waitSync(reducerName)
    success.should.be.equal(true)

    // const x1a = store
    //   .getState()
    //   .map(a => a.x)
    //   .sort()
    //   .join()
    // console.log('store', x1a)

    store.dispatch({
      type: INCREMENT
    })
    // console.log('--INC---')

    await waitSync(reducerName)
    // console.log('--waited---')

    const docs2 = await loadArray(db)(reducerName)
    // console.log('--loaded2---')

    const x2a = store
      .getState()
      .map(a => a.x)
      .sort()
      .join()
    const x2b = docs2
      .map(a => a.x)
      .sort()
      .join()

    // console.log('store', x2a, 'doc', x2b)
    x2a.should.be.equal(x2b)

    done()
  })
})
