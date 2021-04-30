import { initPipes, AnyEvent } from "./pipes";
import { initSelectors } from "./selectors";

interface StoreType<Action, State> {
  getState: () => State;
  dispatch: (a: Action) => Action;
  subscribe: (func: () => void) => void;
}

export const initialize = <
  Event extends AnyEvent = AnyEvent,
  State = any,
  Action extends { type: string } = any
>(
  store: StoreType<Action, State>
) => {
  return {
    ...initPipes<Event, State, Action>(store),
    ...initSelectors(store),
  };
};
