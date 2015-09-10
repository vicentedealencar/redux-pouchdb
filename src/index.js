import PouchDB from 'pouchdb';
import equal from 'deep-equal';
import 'array.from';

export const SET_REDUCER = 'redux-pouchdb/SET_REDUCER';
export const INIT = 'redux-pouchdb/INIT';
export const db = new PouchDB('app');

let isInitialized = false;
export const persistentStore = storeCreator => (reducer, initialState) => {
  const store = storeCreator(reducer, initialState);

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

      save(reducer.name)(reducedState);
    }

    return reducedState;
  };
};

const load = _id => {
  return db.get(_id).then(x => {
    console.log('loaded: ', _id);
    console.table(x);
    return x;
  }).catch(err => {
    if (err.status === 404) {
      return db.put({_id: _id}).then(() => db.get(_id));
    } else {
      throw err;
    }
  });
};

let unpersistedState = {};
let isUpdating = {};
const save = reducerName => {
  const saveReducer = reducerState => {
    if (isUpdating[reducerName]) {
      if (Array.isArray(reducerState)) {
        unpersistedState[reducerName] = [
          ...(unpersistedState[reducerName] || []),
          ...reducerState
        ];
      } else {
        unpersistedState[reducerName] = {
          ...unpersistedState[reducerName],
          ...reducerState
        };
      }

      return;
    }

    isUpdating[reducerName] = true;
    console.log('isUpdating: ', reducerName)

    load(reducerName).then(doc => {

      let newState;
      if (Array.isArray(reducerState)) {
        newState = [
          ...(doc.state || []),
          ...(unpersistedState[reducerName] || []),
          ...reducerState
        ];
      } else {
        newState = {
          ...doc.state,
          ...unpersistedState[reducerName],
          ...reducerState
        };
      }

      const newDoc = {
        ...doc,
        state: newState
      };

      unpersistedState[reducerName] = null;

      db.put(newDoc).catch(error => {
        console.error(error);
      }).then(() => {
        console.log('puted: ', newDoc._id);
        console.table(newDoc);
        isUpdating[reducerName] = false;

        if (unpersistedState[reducerName]) {
          saveReducer(unpersistedState[reducerName]);
        }
      });
    });
  };

  return saveReducer;
};

//window.window.PouchDB = db;
