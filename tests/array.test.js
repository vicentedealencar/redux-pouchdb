import 'should'
import { createStore, compose } from 'redux'
import { persistentStore, persistentReducer } from '../src/index'
import loadArray from '../src/loadArray'
import PouchDB from 'pouchdb'
import timeout from 'timeout-then'

describe('redux-pouchdb array', () => {
  const db = new PouchDB('app', { db: require('memdown') })

  const INCREMENT = 'INCREMENT'
  const DECREMENT = 'DECREMENT'

  const createPersistentStore = compose(persistentStore)(createStore)

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
  const finalReducer = persistentReducer(db, reducerName, true)(reducer)

  it('should persist store state', async done => {
    let store = createPersistentStore(finalReducer)

    await timeout(500)

    const docs = await loadArray(db)(reducerName)

    const x1a = store
      .getState()
      .map(a => a.x)
      .sort()
      .join()
    const x1b = docs
      .map(a => a.x)
      .sort()
      .join()

    x1a.should.be.equal(x1b)

    store.dispatch({
      type: INCREMENT
    })

    await timeout(500)

    const docs2 = await loadArray(db)(reducerName)

    const x2a = store
      .getState()
      .map(a => a.x)
      .sort()
      .join()
    const x2b = docs2
      .map(a => a.x)
      .sort()
      .join()

    x2a.should.be.equal(x2b)

    done()
  })
})
