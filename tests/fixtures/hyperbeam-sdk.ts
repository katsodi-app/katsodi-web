// Isolated browser fixture standing in for @hyperbeam/web. Never imported by
// application routes. Records what the room asked the SDK to do.
type Listener = (
  tabId: number,
  change: { url?: string },
  tab?: { url?: string },
) => void;
type State = {
  embeds: string[];
  options: unknown[];
  calls: string[];
  destroyed: number;
  update?: (url: string) => void;
};
export default async function Hyperbeam(
  container: HTMLElement,
  embedUrl: string,
  options: unknown,
) {
  const w = window as unknown as { __hb?: State };
  const state = (w.__hb ||= {
    embeds: [],
    options: [],
    calls: [],
    destroyed: 0,
  });
  state.embeds.push(embedUrl);
  state.options.push(options);
  const view = document.createElement("div");
  view.className = "fake-hyperbeam";
  view.textContent = "Cloud browser";
  container.append(view);
  const listeners: Listener[] = [];
  state.update = (url: string) =>
    listeners.forEach((listener) => listener(1, { url }, { url }));
  return {
    userId: "hb-user-1234-abcd",
    destroy() {
      state.destroyed++;
      view.remove();
    },
    tabs: {
      async update(props: { url: string }) {
        state.calls.push(`update:${props.url}`);
      },
      reload() {
        state.calls.push("reload");
      },
      goBack() {
        state.calls.push("back");
      },
      goForward() {
        state.calls.push("forward");
      },
      onUpdated: {
        addListener(listener: Listener) {
          listeners.push(listener);
        },
      },
    },
  };
}
