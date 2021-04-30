# rubberdux

## Predictable, functional state management with Redux and RxJS

rubberdux is a simple, opinionated extension of Redux that makes it easy to reason about state management as your app gets larger.
It solves the problem of how to perform side effects using _pipes_ (which are similar to [epics](https://redux-observable.js.org/docs/basics/Epics.html))
and includes a powerful _selection graph_ pattern that enables you to create a graph of derived states that recompute efficiently
as your app gets larger. rubberdux combines the best ideas from [functional reactive programming](https://www.freecodecamp.org/news/functional-reactive-programming-frp-imperative-vs-declarative-vs-reactive-style-84878272c77f/), [Redux Observable](https://redux-observable.js.org/),
[re-frame](https://day8.github.io/re-frame/), and [recoil](https://recoiljs.org/) into a single package. It's type safe,
fun to use, and easy to get started with, with simple patterns to follow that will grow with your app's codebase.

## Installation

To get started, you'll need Redux and RxJS installed. I recommend using [Redux Toolkit](https://redux-toolkit.js.org/), an opinionated and fast
way to build Redux stores. [You can find the tutorial here](https://redux-toolkit.js.org/tutorials/quick-start).

To install in one go:

````
# In your project's directory
npm install @reduxjs/toolkit rxjs rubberdux
```

After installing, create a `rubberdux.ts` file (or `.js` file if you're using Javascript) to export the rubberdux client functions.
You'll need to import your Redux store (we're assuming you already have one) and the `initialize` function from rubberdux.

```typescript
import yourStore from './path/to/your/store';
import { initialize } from 'rubberdux';

const {
  dispatch,
  createPipe,
  createRootSelector,
  fromSelectors,
} = initialize(yourStore);
````

You're now ready to start using rubberdux :)

## Overview

rubberdux wraps your Redux in two layers: the _effects_ layer and the _selection_ layer. These layers perform the same operations
as the `dispatch()` and `subscribe()` functions (respectively) on your Redux store, but are much more powerful. In both, you think
of things in terms of _streams of data_.

In the effects layer, you create map streams of
input events (objects of the form `{ name: string; content: any }`, where `content` is any arbitrary payload) to actions that are passed to your
Redux store. You also can perform arbitrary side-effects like making API calls, listening to websockets, or updating local storage (hence, the 'effects' layer).
The effects layer is the entrance to your Redux store: items must pass through here before reaching your reducer.

In the selection layer, you create streams of computed states from your Redux store. Using some powerful primitives, you compute different derived states from your
app's store. These streams can depend on each other's values, and will react to updates in their dependencies. If your app's state changes, all of the selectors
that need to will update automatically. These streams are the things you subscribe to in your app to update your view with the latest data. These streams are also
efficient: they only recompute things when

Think of rubberdux like a sandwich: the top slice of bread is the effects layer, the stuff in the middle is your Redux store, and the stuff on the bottom is the selection layer.
Data flows from top to bottom through the system: first through the effects layer, then through the Redux store, and then last through your selection layer.

The key thing here is that you **never touch your Redux store directly**. You're never able to call `dispatch` on your store, you can't subscribe directly to it, and you
can't listen for changes in your store's values.

rubberdux introduces a simple yet powerful abstraction that offers you more powerful primitives
than these functions

## Pipes

A _pipe_ is a function of the following form: `(tools) => Observable<Action>`. A pipe is a function that accepts in some `tools`
(a small object that provides some useful APIs, we'll get into that in a minute) and returns an Observable of actions.
This is similar to Epics in `redux-observable`. When you create a pipe, rubberdux will run your function and subscribe to the observable
that you return. When you emit actions from the observable, rubberdux will pass those actions to your store's `dispatch()` function,
causing your reducer to run and the state to update. So in summary: **actions flow out of a pipe and into your store**. Simple, right?

Pipes are created using the `createPipe()` function on your instance. `createPipe` accepts in the pipe you want to create as its first
and only parameter. When you call it, it'll **immediately** call the pipe and subscribe to the returned actions observable. **Pipes are
instantiated immediately when you call `createPipe()`**.

Pipes are where all of your side effects happen where all of your state transitions start. They're a powerful yet simple interface
for performing one-off API calls, subscribing to event streams, and transforming interactions in your app into actions that can be understood
by your store.

### A simple example

Using our definition so far, here's a simple pipe that issues an `{ type: "increment" }` action to a redux store every second:

```typescript
import { interval } from "rxjs";
import { map } from "rxjs/operators";
import { createPipe } from "./path/to/rubberdux/instance";

createPipe((_tools) => {
  return interval(1000).pipe(map((_x) => ({ type: "increment" })));
});
```

This pipe uses the RxJS function [`interval`](https://rxjs-dev.firebaseapp.com/api/index/function/interval): `interval(n)` creates an observable
that emits a new event every `n` milliseconds, where `n` is the number passed as the first argument. Here, we use `interval(1000)` to
create an observable that emits every second.

After we create the observable, we use RxJS' [`pipe`](https://rxjs-dev.firebaseapp.com/guide/operators#piping) function to pipe it
through the [`map`](https://rxjs-dev.firebaseapp.com/api/operators/map) operator. `pipe` accepts in one or more operators as its argument
and returns a new observable created from the operators. The `map` operator creates a new observable that maps every event on the old observable
to a new event specified by the function. It works the same as `Array.map`, just for observables.

Here we use the `map` function to map each event to an `{ type: "increment" }` event. `pipe` will pass our observable to the `map` operator for us
and then return a newly created observable that emits these events. Last, we return this newly created observable from our function. `createPipe` will
take our function, run it with the passed-in `tools` object, and then will subscribe to the result. The end result is that an increment event will be sent
to our store every second, without us having to do anything. Pretty neat!

### Streaming events
