import PouchDB from 'pouchdb';

export const DB_CHANGES = 'DB_CHANGES';

var db = new PouchDB('app');
const docId = 'redux-store';
const emptyDoc = {_id: docId};

export const getState = () => {
  return db.get(docId).catch(function (err) {
    if (err.status === 404) { // not found!
      return db.put(emptyDoc).then(() => db.get(docId));
    } else { // hm, some other error
      throw err;
    }
  });
}

export const persistState = () => createStore => (reducer, initialState) => {
  const store = createStore(reducer, initialState);

  db.changes({include_docs: true}).on('change', function(change) {
    store.dispatch({ type: DB_CHANGES, ...change.doc});
  });

  return store;
};

let unpersistedState = null;
let isUpdating = false;

const updateState = (reducerName, nextState) => {
  if (isUpdating) {
    unpersistedState = {
      ...unpersistedState,
      [reducerName]: nextState
    };

    return;
  }

  isUpdating = true;

  getState().then(doc => {
    const newDoc = {
      ...doc,
      ...unpersistedState,
      [reducerName]: nextState
    };

    // console.log('old', doc);
    // console.log('new', newDoc);
    db.put(newDoc).catch(error => {
      console.error(error);
    }).then(() => {
      isUpdating = false;

      if (unpersistedState) {
        updateState(unpersistedState);
      }
    });

    unpersistedState = null;
  });
};

export function persist(reducer) {
  const fn = (state, action) => {
    const nextState = action.type === DB_CHANGES ? 
      action[reducer.name] :
      reducer(state, action);

    updateState(reducer.name, nextState);

    return nextState;
  };

  return fn;
}

window.destroyDb = () => db.destroy();
