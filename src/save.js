import load from './load';

const unpersistedQueue = {};
let isUpdating = {};

export default (db, madeBy) => {
  const loadReducer = load(db);

  const saveReducer = (reducerName, reducerState) => {
    if (isUpdating[reducerName]) {
      //enqueue promise
      unpersistedQueue[reducerName] = unpersistedQueue[reducerName] || [];
      unpersistedQueue[reducerName].push(reducerState);

      return Promise.resolve();
    }

    isUpdating[reducerName] = true;

    return loadReducer(reducerName).then(doc => {
      const newDoc = { ...doc, madeBy, state: reducerState };
      return newDoc;
    }).then(newDoc => {
      return db.put(newDoc);
    }).then(() => {
      isUpdating[reducerName] = false;
      if (unpersistedQueue[reducerName] &&
          unpersistedQueue[reducerName].length) {
        const next = unpersistedQueue[reducerName].shift();

        return saveReducer(reducerName, next);
      }
    }).catch(console.error.bind(console));
  };

  return saveReducer;
};
