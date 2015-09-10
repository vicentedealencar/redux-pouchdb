export default db => _id => {
  return db.get(_id).then(x => {
    console.log('loaded:', _id);
    console.log(x);
    return x;
  }).catch(err => {
    if (err.status === 404) {
      return db.put({_id: _id}).then(() => db.get(_id));
    } else {
      throw err;
    }
  }).catch(console.log.bind(console));
};
