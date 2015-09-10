import load from './load';

let unpersistedState = {};
let isUpdating = {};

export default (db) => {
  const saveReducer = (reducerName, reducerState) => {
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
    console.log('isUpdating:', reducerName)

    load(db)(reducerName).then(doc => {

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

      console.log('try put:', newDoc._id);
      db.put(newDoc).then(() => {
        console.log('puted:', newDoc._id);
        console.log(newDoc);
        isUpdating[reducerName] = false;
        console.log('hasUpdated:', reducerName)

        if (unpersistedState[reducerName]) {
          saveReducer(unpersistedState[reducerName]);
        }
      }).catch(console.log.bind(console));
    });
  };

  return saveReducer;
};
