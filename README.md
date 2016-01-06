# redux-pouchdb

## What is going on here?

It is very simple:
- The [PouchDB](http://pouchdb.com/) database persists the state of the [Redux](rackt.github.io/redux) store every time it changes.
- An action with type DB_CHANGES is dispatched to the store every time the database syncs.

## Usage

### `persistentStore`

This store enhancer should be composed with yours in order to initialize

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

The reducers you wish to persist should be enhanced with this higher order reducer.

``` js
import { persistentReducer } from 'redux-pouchdb';

const counter = (state = {count: 0}, action) => {
  switch(action.type) {
  case INCREMENT:
  console.log(state.count + 1);
    return { count: state.count + 1 };
  case DECREMENT:
    return { count: state.count - 1 };
  default:
    return state;
  }
};

export default persistentReducer(counter);
```

## Caveat

The current behavior is to have a document relative to the reducer that looks like:

``` js
{
  _id: 'reducerName', // the name the reducer function
  state: {}|[], // the state of the reducer
  _rev: '' // pouchdb keeps track of the revisions
}
```

Notice that if your reducer actually returns an array, and you want your elements to be stored in separate documents of a specific bucket, this is not yet supported.
