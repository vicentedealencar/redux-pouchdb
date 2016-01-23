export default db => _id => {
  return db.get(_id).catch(err => {
    if (err.status === 404) {
      return {_id: _id};
    } else {
      throw err;
    }
  }).catch(console.error.bind(console));
};
