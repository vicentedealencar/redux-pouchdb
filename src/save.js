import load from './load';
import log from './log';


const unpersistedQueue = {};
let isUpdating = {};

export default (db, reducerName) => {
  const loadReducer = load(db);

  const saveReducer = reducerState => {
    if (isUpdating[reducerName]) {
      log('unpersisted enqueue', unpersistedQueue, reducerState);
      //enqueue promise
      unpersistedQueue[reducerName] = unpersistedQueue[reducerName] || [];
      unpersistedQueue[reducerName].push(reducerState);

      return Promise.resolve();
    }

    isUpdating[reducerName] = true;
    log('isUpdating:', reducerName, typeof reducerName)

    return loadReducer(reducerName).then(doc => {
      log('after load');
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
      log('try put:', newDoc._id);
      log(newDoc);

      return db.put(newDoc);
    }).then(() => {
      isUpdating[reducerName] = false;
      log('hasUpdated:', reducerName)
    }).then(() => {
      log('unpersistedQueue', unpersistedQueue);
      if (unpersistedQueue[reducerName]) {
        const next = unpersistedQueue[reducerName].shift();
        log('next', reducerName, next);

        return saveReducer(next);
      }
    }).catch(console.error.bind(console));
  };

  return saveReducer;
};
