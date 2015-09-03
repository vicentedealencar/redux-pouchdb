import PouchDB from 'pouchdb';
import equal from 'deep-equal';
import 'array.from';

const SET_REDUCER = 'SET_REDUCER';
const db = new PouchDB('app');
let isInitialized = false;

export const persistentStore = storeCreator => (reducer, initialState) => {
  const store = storeCreator(reducer, initialState);

  db.changes({include_docs: true}).on('change', change => {
    isInitialized = true;
    const { _id, _rev, state } = change.doc;

    const action = {
      type: SET_REDUCER,
      reducer: _id,
      state: state
    };

    store.dispatch(action);
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
    // console.log('loaded: ', _id);
    // console.table(x);
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
        // console.log('puted: ', newDoc._id);
        // console.table(newDoc);
        isUpdating[reducerName] = false;

        if (unpersistedState[reducerName]) {
          saveReducer(unpersistedState[reducerName]);
        }
      });
    });
  };

  return saveReducer;
};

//super powers
window.db = db;

window.allDocs = () =>
  db.allDocs({include_docs: true})
  .then(x => console.log(x));
