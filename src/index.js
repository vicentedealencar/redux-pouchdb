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
    console.log('initialize');

    res.rows.forEach(row => setReducer(row.doc));

    store.dispatch({
      type: INIT
    });
  }).then(() => {
    db.changes({
      include_docs: true,
      live: true,
      since: 'now'
    }).on('change', change => {
      // if (change.deleted) {
      //   // change.id holds the deleted id
      //   onDeleted(change.id);
      // } else { // updated/inserted
      //   // change.doc holds the new doc
      //   onUpdatedOrInserted(change.doc);
      // }
      console.log('change');

      setReducer(change.doc);
    });
  }).catch(console.log.bind(console));

  return store;
};

export const persistentReducer = reducer => {
  let lastState;

  return (state, action) => {
    console.log('reduce this', state, action);
    if (action.type === SET_REDUCER &&
        action.reducer === reducer.name) {
      console.log('short-circuit');

      lastState = action.state;
      return reducer(action.state, action);
    }

    const reducedState = reducer(state, action);
    console.log('lastState and reducedState', lastState, reducedState);

    if (isInitialized && !equal(reducedState,lastState)) {
      lastState = reducedState;

      console.log('lets save!');
      saveReducer(reducer.name, reducedState);
    }

    return reducedState;
  };
};

//window.window.PouchDB = db;
