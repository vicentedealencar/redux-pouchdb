import equal from 'deep-equal';
import 'array.from';
import save from './save';

export const SET_REDUCER = 'redux-pouchdb/SET_REDUCER';
export const INIT = '@@redux-pouchdb/INIT';

let store;
let isInitialized = {};
export const persistentStore = storeCreator => (reducer, initialState) => {

  store = storeCreator(reducer, initialState);

  return store;
};

export const persistentReducer = (db, reducerName) => reducer => {
  let lastState;

  const saveReducer = save(db, reducerName);

  const setReducer = doc => {
    const { _id, _rev, state } = doc;

    store.dispatch({
      type: SET_REDUCER,
      reducer: reducerName,//_id,
      state,
      _rev
    });
  };

  db.allDocs({include_docs: true}).then(res => {
    isInitialized[reducerName] = true;
    console.log('initialize');

    const promises = res.rows.map(row => {
      return setReducer(row.doc);
    });
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
      console.log('!equal will SET_REDUCER', change.doc.state, store.getState());

      const storeState = store.getState();

      if (change.doc.state) {
        if (!equal(change.doc.state, storeState)) {
          console.log('setReducert');
          setReducer(change.doc);
        }
      } else {
        console.log('saveReducer');
        saveReducer(store.getState());
      }
    });
  }).catch(console.error.bind(console));

  return (state, action) => {
    console.log('reduce this', state, action);
    if (action.type === SET_REDUCER &&
        action.reducer === reducerName &&
        action.state) {
      console.log('short-circuit');

      lastState = action.state;
      return reducer(action.state, action);
    }

    const reducedState = reducer(state, action);
    console.log('reducedState', reducedState);

    if (isInitialized[reducerName] && !equal(reducedState,lastState)) {
      lastState = reducedState;

      console.log('lets save!');
      console.log(typeof reducerName);
      saveReducer(reducedState);
    }

    return reducedState;
  };
};
