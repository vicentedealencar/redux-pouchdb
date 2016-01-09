import 'should'
import { createStore, compose, applyMiddleware } from 'redux'
import { persistentStore, persistentReducer } from '../src/index'
import load from '../src/load'
import PouchDB from 'pouchdb'
import timeout from 'timeout-then'

console.log('lets test!');
describe('redux-pouchdb tests', () => {
  const db = new PouchDB('app', {db : require('memdown')})

  const INCREMENT = 'INCREMENT'
  const DECREMENT = 'DECREMENT'

  const createPersistentStore = compose(persistentStore)(createStore)

  const reducer = (state = {x: 0}, action) => {
    switch(action.type) {
    case INCREMENT:
    console.log(state.x + 1)
      return { x: state.x + 1 }
    case DECREMENT:
      return { x: state.x - 1 }
    default:
      return state
    }
  }
  const reducerName = 'counter'
  const finalReducer = persistentReducer(db, reducerName)(reducer)

  it('should persist store state', async (done) => {
    let store = createPersistentStore(finalReducer)
    console.log('store created')

    await timeout(300)

    const doc = await load(db)(reducerName)

    console.log('state',store.getState())
    console.log('doc',doc)
    console.log('testing',store.getState().x, doc.state.x)

    const x1a = store.getState().x
    const x1b = doc.state.x

    x1a.should.be.equal(x1b)

    console.log('incrementing')
    store.dispatch({
      type: INCREMENT
    })
    
    await timeout(300)

    const doc2 = await load(db)(reducerName)
    console.log('testing moar',store.getState().x, doc2.state.x)

    const x2a = store.getState().x
    const x2b = doc2.state.x

    x2a.should.be.equal(x2b)

    done()
  })
})
