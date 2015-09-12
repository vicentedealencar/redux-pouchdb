import PouchDB from 'pouchdb';
import equal from 'deep-equal';
import 'array.from';
import save from './save';

export const SET_REDUCER = 'redux-pouchdb/SET_REDUCER';
export const INIT = '@@redux-pouchdb/INIT';

export const db = new PouchDB('app');

const saveReducer = save(db);
let isInitialized = false;
export const persistentStore = storeCreator => (reducer, initialState) => {
  const store = storeCreator(reducer, initialState);

  const setReducer = doc => {
    const { _id, _rev, state } = doc;

    store.dispatch({
      type: SET_REDUCER,
      reducer: _id,
      state,
      _rev
    });
  };

  db.allDocs({include_docs: true}).then(res => {
    isInitialized = true;
    console.log('initialize');

    const promises = res.rows.map(row => setReducer(row.doc));
    return Promise.all(promises);
  }).then(() => {
    store.dispatch({
      type: INIT
    });

    return db.changes({
      include_docs: true,
      live: true,
      since: 'now'
    }).on('change', change => {
      console.log('change');
      console.log(change);
      console.log('!equal SET_REDUCER', change.doc.state, store.getState());

      const storeState = store.getState();

      if (change.doc.state) {
        if (!equal(change.doc.state, storeState)) {
          console.log('setReducert');
          setReducer(change.doc);
        }
      } else {
        console.log('saveReducer');
        saveReducer(change.doc._id, store.getState());
      }
    });
  }).catch(console.log.bind(console));

  return store;
};

export const persistentReducer = reducer => {
  let lastState;

  return (state, action) => {
    console.log('reduce this', state, action);
    if (action.type === SET_REDUCER &&
        action.reducer === reducer.name &&
        action.state) {
      console.log('short-circuit');

      lastState = action.state;
      return reducer(action.state, action);
    }

    const reducedState = reducer(state, action);
    console.log('reducedState', reducedState);

    if (isInitialized && !equal(reducedState,lastState)) {
      lastState = reducedState;

      console.log('lets save!');
      saveReducer(reducer.name, reducedState);
    }

    return reducedState;
  };
};

const window = window || {};
window.PouchDB = db;
