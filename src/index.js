import equal from 'deep-equal';
import 'array.from';
import save from './save';

export const SET_REDUCER = 'redux-pouchdb/SET_REDUCER';
export const INIT = '@@redux-pouchdb/INIT';

const LOCAL_IDENTIFIER = Array(12).fill(0).map(_=>String.fromCharCode((x=>x>25?x+71:x+65)(Math.floor(Math.random()*52)))).join('');

let saveReducer;
let isInitialized = false;
export const persistentStore = (db, onChange = []) => storeCreator => (reducer, initialState) => {

  const store = storeCreator(reducer, initialState);

  saveReducer = save(db, LOCAL_IDENTIFIER);

  if (!Array.isArray(onChange)) {
    onChange = [onChange];
  }

  const setReducer = doc => {
    const { _id, _rev, state } = doc;

    store.dispatch({
      type: SET_REDUCER,
      reducer: _id,
      state,
      _rev
    });

    onChange.forEach(fn => {
      const result = fn(doc);
      if (result) {
        store.dispatch(result);
      }
    });
  };

  db.allDocs({include_docs: true}).then(res => {
    const promises = res.rows.map(row => setReducer(row.doc));
    return Promise.all(promises);
  }).then(() => {
    isInitialized = true;
    store.dispatch({
      type: INIT
    });

    return db.changes({
      include_docs: true,
      live: true,
      since: 'now'
    }).on('change', change => {
      if (change.doc.state && change.doc.madeBy !== LOCAL_IDENTIFIER) {
        setReducer(change.doc);
      }
    });
  }).catch(console.error.bind(console));

  return store;
};

export const persistentReducer = (reducer, name) => {
  let lastState;
  name = name || reducer.name;

  return (state, action) => {
    if (action.type === SET_REDUCER &&
        action.reducer === name &&
        action.state) {

      lastState = action.state;
      return reducer(action.state, action);
    }
    if (action.type === SET_REDUCER) {
      // Another reducer's state... ignore.
      return state;
    }

    const reducedState = reducer(state, action);
    if (isInitialized && !equal(reducedState,lastState)) {
      lastState = reducedState;
      saveReducer(name, reducedState);
    }

    return reducedState;
  };
};
