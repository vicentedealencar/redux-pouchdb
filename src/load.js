export default db => _id => {
  console.log('go load', _id);
  return db.get(_id).then(x => {
    console.log('loaded:', _id);
    console.log(x);
    return x;
  }).catch(err => {
    if (err.status === 404) {
      console.log(404);
      return db.put({_id: _id}).then(() => {
        console.log('new');
        return db.get(_id);
      });
    } else {
      throw err;
    }
  }).catch(console.log.bind(console));
};
