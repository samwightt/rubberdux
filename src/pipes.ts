import { Observable, Subject, combineLatest } from "rxjs";
import { map } from "rxjs/operators";

interface StoreType<Action, Store> {
  dispatch: (action: Action) => Action;
  getState: () => Store;
}

export interface AnyEvent {
  name: string;
  content?: any;
}

type EventFromUnion<E extends AnyEvent, N> = Extract<
  E,
  { name: N }
> extends never
  ? { name: string; content?: any }
  : Extract<E, { name: N }>;

type StreamFunc<Event extends AnyEvent> = <A extends Event["name"][]>(
  ...type: A
) => Observable<EventFromUnion<Event, A>>;

export interface Pipe<Event extends AnyEvent, Action, Store> {
  (props: {
    stream: StreamFunc<Event>;
    getStore: () => Store;
  }): Observable<Action>;
}

export const initPipes = <
  E extends AnyEvent,
  S = any,
  A extends { type: string } = any
>(
  store: StoreType<A, S>
) => {
  let eventObservers: Map<E["name"], Subject<E>> = new Map();
  const outputSubject = new Subject<A>();

  outputSubject.subscribe((x) => store.dispatch(x));

  const createPipe = (pipe: Pipe<E, A, S>) => {
    const stream: StreamFunc<E> = (...args) => {
      const arr = Array.from(args).map((name) => {
        const subj = eventObservers.get(name);
        if (subj) {
          return subj;
        } else {
          const eventSubject = new Subject<E>();
          eventObservers.set(name, eventSubject);
          return eventSubject;
        }
      });

      return combineLatest(arr) as any;
    };

    const result = pipe({ stream, getStore: () => store.getState() });
    const unsubscribe = result.subscribe(outputSubject);

    return unsubscribe;
  };

  const dispatch = (e: E) => {
    const subj = eventObservers.get(e.name);
    if (subj) subj.next(e);
    else eventObservers.set(e.name, new Subject());
    return e;
  };

  return { createPipe, dispatch };
};

const store = {
  dispatch: (action: { type: string; payload: number }) => action,
  getState: () => 5,
};

const hello = initPipes<{ name: "testing"; content: string }>(store);
hello.createPipe(({ stream }) => {
  return stream("testing").pipe(map(() => ({ type: "testing", payload: 1 })));
});
