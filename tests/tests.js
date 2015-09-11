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

    db.allDocs({include_docs: true}).then(res => {
      const docs = res.rows.docs;

      if (!docs) {
        return;
      }

      const promises = docs.map(d => db.remove(d));
      console.log('removing');

      return Promise.all(promises);
    }).then(() => {
      let store = createPersistentStore(finalReducer);
      console.log('loading');

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


    }).catch(e => {console.error(e)});
});
