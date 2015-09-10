import test from 'tape';
import { createStore, compose, applyMiddleware } from 'redux';
import { persistentStore, persistentReducer, db, UP_TO_DATE } from '../src/index';
import load from '../src/load';

const INCREMENT = 'INCREMENT';
const DECREMENT = 'DECREMENT';

const createPersistentStore = compose(persistentStore)(createStore);

const reducer = (state = {x: 0}, action) => {
  switch(action.type) {
  case INCREMENT:
    return { x: state.x + 1 };
  case DECREMENT:
    return { x: state.x - 1 };
  default:
    return state;
  }
};

const finalReducer = persistentReducer(reducer);

test('should persist store state', function (t) {
    t.plan(2);

    let store = createPersistentStore(finalReducer);

    setTimeout(() => {
      store.dispatch({
        type: INCREMENT
      });

      setTimeout(() => {
        load(db)(reducer.name).then(doc => {
          t.equal(store.getState().x, doc.state.x);
        });
      }, 1000);
    }, 1000);

    load(db)(reducer.name).then(doc => {
      t.equal(store.getState().x, doc.state.x);
    });
});
