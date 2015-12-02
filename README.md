# redux-pouchdb

## What is going on here?

It is very simple:
- The [PouchDB](http://pouchdb.com/) database persists the state of the [Redux](rackt.github.io/redux) store every time it changes.
- An action with type DB_CHANGES is dispatched to the store every time the database syncs.

## Usage

### `persistentStore`

``` js
import { persistentStore } from 'redux-pouchdb';

const db = new PouchDB('dbname');

//optional
const applyMiddlewares = applyMiddleware(
  thunkMiddleware,
  loggerMiddleware
);

const createStoreWithMiddleware = compose(
  applyMiddlewares,
  persistentStore(db),
  createStore);

const store = createStoreWithMiddleware(reducer, initialState);
```

### `persistentReducer`

``` js
import { persistentReducer } from 'redux-pouchdb';

function counter(state = 0, action) {
  switch (action.type) {
  case INCREMENT_COUNTER:
    return state + 1;
  case DECREMENT_COUNTER:
    return state - 1;
  default:
    return state;
  }
}

export default persistentReducer(counter);
```
