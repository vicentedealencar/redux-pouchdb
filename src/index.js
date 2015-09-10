import PouchDB from 'pouchdb';
import equal from 'deep-equal';
import 'array.from';
import save from './save';

export const SET_REDUCER = 'redux-pouchdb/SET_REDUCER';
export const INIT = 'redux-pouchdb/INIT';

export const db = new PouchDB('app');

let saveReducer = null;
let isInitialized = false;
export const persistentStore = storeCreator => (reducer, initialState) => {
  const store = storeCreator(reducer, initialState);

  saveReducer = save(db);

  const setReducer = doc => {
    const { _id, _rev, state } = doc;

    store.dispatch({
      type: SET_REDUCER,
      reducer: _id,
      state: state
    });
  };

  db.allDocs({include_docs: true}).then(res => {
    isInitialized = true;

    const docs = res.rows.map(row => row.doc);

    docs.forEach(doc => setReducer(doc));

    console.log('if not persisted, persist store.getState()', store.getState());
    console.log(docs);

    store.dispatch({
      type: INIT
    });
  }).catch(console.log.bind(console));

  const options = {
    include_docs: true,
    live: true,
    since: 'now'
  };

  db.changes(options).on('change', change => {
    // if (change.deleted) {
    //   // change.id holds the deleted id
    //   onDeleted(change.id);
    // } else { // updated/inserted
    //   // change.doc holds the new doc
    //   onUpdatedOrInserted(change.doc);
    // }

    setReducer(change.doc);
  });

  return store;
};

export const persistentReducer = reducer => {
  let lastState;

  return (state, action) => {
    if (action.type === SET_REDUCER &&
        action.reducer === reducer.name) {
      return reducer(action.state, action);
    }

    const reducedState = reducer(state, action);

    if (isInitialized && !equal(reducedState,lastState)) {
      lastState = reducedState;

      saveReducer(reducer.name, reducedState);
    }

    return reducedState;
  };
};

//window.window.PouchDB = db;
