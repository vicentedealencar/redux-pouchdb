import load from './load';

const unpersistedQueue = {};
let isUpdating = {};

export default (db) => {
  const saveReducer = (reducerName, reducerState) => {
    if (isUpdating[reducerName]) {
      //enqueue promise
      unpersistedQueue[reducerName] = unpersistedQueue[reducerName] || [];
      unpersistedQueue[reducerName].push(reducerState);

      return Promise.resolve();
    }

    isUpdating[reducerName] = true;
    console.log('isUpdating:', reducerName)

    return load(db)(reducerName).then(doc => {
      const newDoc = {
        ...doc
      };

      if (Array.isArray(reducerState)) {
        newDoc.state = [
          ...(doc.state || []),
          ...reducerState
        ];
      } else {
        newDoc.state = {
          ...doc.state,
          ...reducerState
        };
      }

      return newDoc;
    }).then(newDoc => {
      console.log('try put:', newDoc._id);
      console.log(newDoc);

      return db.put(newDoc);
    }).then(() => {
      isUpdating[reducerName] = false;
      console.log('hasUpdated:', reducerName)
    }).then(() => {
      if (unpersistedQueue[reducerName]) {
        const next = unpersistedQueue[reducerName].shift();
        console.log('next', reducerName, next);

        return saveReducer(next);
      }
    }).catch(console.log.bind(console));
  };

  return saveReducer;
};
