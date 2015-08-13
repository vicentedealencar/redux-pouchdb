# redux-pouchdb

## Usage

`persistState` store enhancer

``` js
import { createStore, applyMiddleware, combineReducers, compose } from 'redux';
import thunk from 'redux-thunk';
import * as reducers from './reducers';
import { persistState } from 'redux-pouchdb';

const createStoreWithMiddleware = compose(
  applyMiddleware(thunk),
  persistState(),
  createStore);
const reducer = combineReducers(reducers);
const store = createStoreWithMiddleware(reducer);
```

`persist` reducer

``` js
import { persist } from 'redux-pouchdb';
import { INCREMENT_COUNTER, DECREMENT_COUNTER } from '../actions/counter';

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

export default persist(counter);
```
