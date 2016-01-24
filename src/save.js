import load from './load';

const unpersistedQueue = {};
let isUpdating = {};

export default db => {
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
      // TODO use object spread operator when standardized
      // (see https://github.com/vicentedealencar/redux-pouchdb/issues/5)
      const newDoc = Object.assign({}, doc);

      if (Array.isArray(reducerState)) {
        newDoc.state = [
          ...(doc.state || []),
          ...reducerState
        ];
      } else {
        // TODO use object spread operator when standardized
        // (see https://github.com/vicentedealencar/redux-pouchdb/issues/5)
        newDoc.state = Object.assign({}, doc.state, reducerState);
      }

      return newDoc;
    }).then(newDoc => {
      return db.put(newDoc);
    }).then(() => {
      isUpdating[reducerName] = false;
      if (unpersistedQueue[reducerName]) {
        const next = unpersistedQueue[reducerName].shift();

        return saveReducer(next);
      }
    }).catch(console.error.bind(console));
  };

  return saveReducer;
};
