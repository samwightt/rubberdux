import { BehaviorSubject, combineLatest, Observable } from "rxjs";
import { distinctUntilChanged, map, share } from "rxjs/operators";

interface Store<State> {
  getState: () => State;
  subscribe: (listener: () => void) => void;
}

export const rootSelectorFactory = <S>(state: Observable<S>) => {
  const createRootSelector = <T>(selector: (state: S) => T) => {
    return state.pipe(
      map((x) => selector(x)),
      distinctUntilChanged(),
      share()
    );
  };

  return createRootSelector;
};

type ValuesType<T extends [...Observable<any>[]]> = {
  [I in keyof T]: T[I] extends Observable<infer R> ? R : never;
};

type DerivedSelector<A extends Observable<any>[], T> = (
  ...args: ValuesType<A>
) => T;
type PayloadSelector<A extends any[], T, P> = (payload: P, ...args: A) => T;
type SelectorFactory<T, P> = (payload: P) => Observable<T>;

const fromSelectors = <A extends Observable<any>[]>(...args: A) => {
  const combine = (): Observable<ValuesType<A>> => {
    return combineLatest(args) as any;
  };

  const createSelector = <T>(
    selector: DerivedSelector<A, T>
  ): Observable<T> => {
    return combine().pipe(
      map((x) => selector(...x)),
      distinctUntilChanged(),
      share()
    );
  };

  const createFactory = <Payload, T>(
    selector: PayloadSelector<ValuesType<A>, T, Payload>
  ): SelectorFactory<T, Payload> => {
    return (payload) => {
      return createSelector((...args) => selector(payload, ...args));
    };
  };

  return { combine, createSelector, createFactory };
};

type SelectorFactoryPayload<A extends [...SelectorFactory<any, any>[]]> = {
  [I in keyof A]: A[I] extends SelectorFactory<any, infer P> ? P : never;
}[number];
type SelectorFactoryInput<A extends [...SelectorFactory<any, any>[]]> = {
  [I in keyof A]: A[I] extends SelectorFactory<infer T, any> ? T : never;
};

/**
 * @param factories
 * @returns
 */
const fromFactories = <A extends SelectorFactory<any, any>[]>(
  ...factories: A
) => {
  const createFactory = <Payload, T>(
    selector: PayloadSelector<SelectorFactoryInput<A>, T, Payload>
  ): SelectorFactory<T, Payload & SelectorFactoryPayload<A>> => {
    return (payload) => {
      const selectors = factories.map((x) => x(payload));
      return (combineLatest(selectors) as any).pipe(
        map((x) => selector(payload, ...(x as any))),
        distinctUntilChanged(),
        share()
      );
    };
  };

  return { createFactory };
};

export const initSelectors = <State>(store: Store<State>) => {
  const stateSubject = new BehaviorSubject(store.getState());
  store.subscribe(() => {
    stateSubject.next(store.getState());
  });

  const stateObserver = stateSubject.pipe(distinctUntilChanged(), share());
  const createRootSelector = rootSelectorFactory(stateObserver);

  return {
    createRootSelector,
    fromSelectors,
    fromFactories,
  };
};
