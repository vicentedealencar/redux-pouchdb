import load from './load';

const unpersistedQueue = {};
let isUpdating = {};

export default (db, reducerName) => {
  const loadReducer = load(db);

  const saveReducer = reducerState => {
    if (isUpdating[reducerName]) {
      console.log('unpersisted enqueue', unpersistedQueue, reducerState);
      //enqueue promise
      unpersistedQueue[reducerName] = unpersistedQueue[reducerName] || [];
      unpersistedQueue[reducerName].push(reducerState);

      return Promise.resolve();
    }

    isUpdating[reducerName] = true;
    console.log('isUpdating:', reducerName, typeof reducerName)

    return loadReducer(reducerName).then(doc => {
      console.log('after load');
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
      console.log('unpersistedQueue', unpersistedQueue);
      if (unpersistedQueue[reducerName]) {
        const next = unpersistedQueue[reducerName].shift();
        console.log('next', reducerName, next);

        return saveReducer(next);
      }
    }).catch(console.error.bind(console));
  };

  return saveReducer;
};
