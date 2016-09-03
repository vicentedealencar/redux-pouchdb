# redux-pouchdb

## What is going on here?

It is very simple:
- The [PouchDB](http://pouchdb.com/) database persists the state of chosen parts of the [Redux](rackt.github.io/redux) store every time it changes.
- Your reducers will be passed the state from PouchDB when your app loads and every time a change arrives (if you are syncing with a remote db).

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
  persistentStore(db)
)(createStore);

const store = createStoreWithMiddleware(reducer, initialState);
```

The `persistentStore` enhancer takes an optional second argument which can be a function or an array of functions which are called whenever changes arrive from the database. These functions are given the document (see the format at the bottom) from PouchDB and any truthy return values will be dispatched to the store. You can use this to set up more complex actions based on new data. If you want to take advantage of any middleware you are also setting up, compose the `persistentStore` before `applyMiddlewares`

```js
const changeHandler = doc => {
  // Return thunk based on doc.
};
const createStoreWithMiddleware = compose(
  persistentStore(db, changeHandler),
  applyMiddlewares
)(createStore);
// ...
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

NOTE: If you plan on minifying your code, or you want to use a name different from the reducer function name, you can pass a second parameter to `persistentReducer`.

```js
export default persistentReducer(counter, 'counter');
```

## Caveat

The current behavior is to have a document relative to the reducer that looks like:

``` js
{
  _id: 'reducerName', // the name of the reducer function
  state: {}|[], // the state of the reducer
  _rev: '' // pouchdb keeps track of the revisions
}
```

Notice that if your reducer actually returns an array, and you want your elements to be stored in separate documents of a specific bucket, this is not yet supported.
