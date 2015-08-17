import PouchDB from 'pouchdb';

const DB_CHANGES = 'DB_CHANGES';
const db = new PouchDB('app');
const docId = 'redux-store';
const emptyDoc = {_id: docId};

export const persistentStore = storeCreator => (reducer, initialState) => {
  const store = storeCreator(reducer, initialState);

  db.changes({include_docs: true}).on('change', function(change) {
    store.dispatch({ type: DB_CHANGES, ...change.doc});
  });

  return store;
};

export const persistentReducer = reducer => (state, action) => {
  if (action.type === DB_CHANGES && action[reducer.name]) {
    return action[reducer.name]; //short-circuit reducer
  }

  const nextState = reducer(state, action);

  persistState({[reducer.name]: nextState});

  return nextState;
};

let unpersistedState = null;
let isUpdating = false;
const persistState = (nextState) => {
  if (isUpdating) {
    unpersistedState = {
      ...unpersistedState,
      ...nextState
    };

    return;
  }

  isUpdating = true;

  getState().then(doc => {
    const newDoc = {
      ...doc,
      ...unpersistedState,
      ...nextState
    };

    // console.log('old', doc);
    // console.log('new', newDoc);
    db.put(newDoc).catch(error => {
      console.error(error);
    }).then(() => {
      isUpdating = false;

      if (unpersistedState) {
        persistState(unpersistedState);
      }
    });

    unpersistedState = null;
  });
};

const getState = () => {
  return db.get(docId).catch(err => {
    if (err.status === 404) {
      return db.put(emptyDoc).then(() => db.get(docId));
    } else {
      throw err;
    }
  });
}

window.destroyDb = () => db.destroy();
