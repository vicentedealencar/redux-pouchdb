import log from './log';

export default db => _id => {
  log('go load', _id);
  return db.get(_id).then(x => {
    log('loaded:', _id);
    log(x);
    return x;
  }).catch(err => {
    if (err.status === 404) {
      log(404);
      return {_id: _id};
    } else {
      throw err;
    }
  }).catch(log.bind(console));
};
