import test from 'tape';
import { createStore, compose, applyMiddleware } from 'redux';
import { persistentStore, persistentReducer, db, UP_TO_DATE } from '../src/index';
import load from '../src/load';
import PouchDB from 'pouchdb';
import Erase from 'pouchdb-erase';

PouchDB.plugin(Erase);

const INCREMENT = 'INCREMENT';
const DECREMENT = 'DECREMENT';

const createPersistentStore = compose(persistentStore)(createStore);

const reducer = (state = {x: 0}, action) => {
  switch(action.type) {
  case INCREMENT:
  console.log(state.x + 1);
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

    db.erase().then(() => {
      let store = createPersistentStore(finalReducer);
      console.log('loading');

      setTimeout(() => {
        load(db)(reducer.name).then(doc => {
          console.log('testing',store.getState().x, doc.state.x);
          t.equal(store.getState().x, doc.state.x);
        }).then(() => {
          console.log('incrementing');
          store.dispatch({
            type: INCREMENT
          });

          setTimeout(() => {
            load(db)(reducer.name).then(doc => {
              console.log('testing moar',store.getState().x, doc.state.x);
              t.equal(store.getState().x, doc.state.x);
            });
          }, 1000);
        });
      }, 1000);
    }).catch(e => {console.error(e)});
});
