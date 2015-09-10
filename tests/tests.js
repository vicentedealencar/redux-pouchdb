import test from 'tape';
import { createStore, compose, applyMiddleware } from 'redux';
import { persistentStore, persistentReducer, db, init } from '../src/index';

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

test('should persist store state', function (t) {
    t.plan(2);

    const testMiddleware = store => next => action => {
      if (action.type === INIT) {
        store.dispatch({
          type: INCREMENT
        });

        const state = store.getState();

        console.log('t1');
        t.equal(state.x, 1);

        setTimeout(() => {
          db.allDocs({include_docs: true}).then(docs => {
            //console.log(docs)

            t.equal(state.x, docs[0].state.x);
          });
        }, 3000);
      }

      return next(action);
    };

    const finalCreateStore = compose(applyMiddleware(testMiddleware))(createPersistentStore);

    let store = finalCreateStore(persistentReducer(reducer));
});
