// Requests the msw worker refused to let leave the browser. Its own module so
// the no-internet test can drain what it provoked without loading the setup
// file a second time.
const unhandled: string[] = [];

export const recordUnhandled = (target: string) => {
  unhandled.push(target);
};
export const takeUnhandled = () => unhandled.splice(0);
