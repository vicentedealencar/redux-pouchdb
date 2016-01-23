import equal from 'deep-equal';
import 'array.from';
import save from './save';

export const SET_REDUCER = 'redux-pouchdb/SET_REDUCER';
export const INIT = '@@redux-pouchdb/INIT';

let saveReducer;
let isInitialized = false;
export const persistentStore = db => storeCreator => (reducer, initialState) => {

  const store = storeCreator(reducer, initialState);

  saveReducer = save(db);

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
      const storeState = store.getState();

      if (change.doc.state) {
        if (!equal(change.doc.state, storeState)) {
          setReducer(change.doc);
        }
      } else {
        saveReducer(change.doc._id, store.getState());
      }
    });
  }).catch(console.error.bind(console));

  return store;
};

export const persistentReducer = reducer => {
  let lastState;

  return (state, action) => {
    if (action.type === SET_REDUCER &&
        action.reducer === reducer.name &&
        action.state) {

      lastState = action.state;
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
