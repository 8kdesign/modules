import {
  type ReactNode,
  createContext,
  createRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { STATE_CONNECTED } from "../communication_core_library/MqttController";
import { useMultiUser } from "../communication_core_library/MultiUserContext";

type ContextType = {
  globalStateRef: React.MutableRefObject<any>;
  updateGlobalState: (path: string, updateJson: any) => void;
  syncGlobalState: () => void;
  getCurrentTime: () => number;
};

const Context = createContext<ContextType>({
  globalStateRef: createRef(),
  updateGlobalState: () => {},
  syncGlobalState: () => {},
  getCurrentTime: () => new Date().getTime(),
});

type Props = {
  topicHeader: string;
  children: ReactNode;
};

/**
 * Parent component with global state context.
 * Allows for maintaining a global state across multiple devices.
 * The global state should be a JSON.
 *
 * Steps to use:
 * 1. To update or insert, call 'updateGlobalState' with the path and updated value.
 * 2. To delete, call 'updateGlobalState' with the path and put value as null.
 * 3. If required, broadcast the existing state with 'syncGlobalState'.
 *
 * An empty path indicates replacement of entire global state.
 * Use GlobalStateTestScreen to get a better understanding of the behaviour.
 * Components within it can call 'useGlobalState' to obtain this context.
 */
export function GlobalStateContext(props: Props) {
  const [globalState, setGlobalState] = useState<any>({});
  const multiUser = useMultiUser();
  const globalStateRef = useRef<any>({});
  const [timeOffset, setTimeOffset] = useState(0);

  useEffect(() => {
    if (
      multiUser?.connectionState === STATE_CONNECTED &&
      props.topicHeader.length !== 0
    ) {
      multiUser?.controller.current?.subscribe(props.topicHeader + "/#");
    }
  }, [multiUser?.connectionState, multiUser?.controller, props.topicHeader]);

  useEffect(() => {
    multiUser?.addMessageCallback("globalstate", (response) => {
      let splitTopic = response?.topic.split("/");
      if (splitTopic.length < 1 || splitTopic[0] !== props.topicHeader) {
        return;
      }
      if (splitTopic.length === 1) {
        try {
          update(JSON.parse(response?.message ?? "{}"));
        } catch {
          update({});
        }
        return;
      }
      try {
        let newGlobalState = Object.assign({}, globalStateRef.current);
        if (
          globalStateRef instanceof Array ||
          typeof globalStateRef === "string"
        ) {
          newGlobalState = {};
        }
        let currentJson = newGlobalState;
        for (let i = 1; i < splitTopic.length - 1; i++) {
          let subTopic = splitTopic[i];
          if (
            !(currentJson[subTopic] instanceof Object) ||
            currentJson[subTopic] instanceof Array ||
            typeof currentJson[subTopic] === "string"
          ) {
            currentJson[subTopic] = {};
          }
          currentJson = currentJson[subTopic];
        }
        let jsonMessage = JSON.parse(response?.message ?? "{}");
        if (!jsonMessage) {
          delete currentJson[splitTopic[splitTopic.length - 1]];
        } else {
          currentJson[splitTopic[splitTopic.length - 1]] = jsonMessage;
        }
        update(newGlobalState);
      } catch {}
    });
  }, [multiUser, props.topicHeader]);

  useEffect(() => {
    try {
      fetch("https://worldtimeapi.org/api/timezone/Asia/Singapore")
        .then((response) => response.json())
        .then((data) => {
          let time = new Date(data.datetime).getTime();
          let offset = time - new Date().getTime();
          setTimeOffset(offset);
          console.log("Time offset", offset);
        })
        .catch((error) => {
          console.log(error);
        });
    } catch {}
  }, []);

  /**
   * Obtains the current time that is synced with other devices.
   * Offset obtained via this free api: https://worldtimeapi.org/api/timezone/Asia/Singapore
   *
   * @returns Corrected current timing.
   */
  function getCurrentTime() {
    return new Date().getTime() + timeOffset;
  }

  /**
   * Updates both globalState and globalStateRef at once.
   *
   * @param newState New global state value
   */
  function update(newState: any) {
    globalStateRef.current = newState;
    setGlobalState(newState);
  }

  /**
   * Updates part of the global state.
   * Put updated state as null to remove the path.
   *
   * @param path Path leading to portion to modify, separated by '/'
   * @param updatedState Value to replace at path
   */
  function updateGlobalState(path: string, updatedState: any) {
    if (props.topicHeader.length === 0) return;
    let topic = props.topicHeader;
    if (path.length !== 0 && !path.startsWith("/")) {
      topic += "/";
    }
    topic += path;
    multiUser?.controller.current?.publish(
      topic,
      JSON.stringify(updatedState),
      false
    );
  }

  /**
   * Broadcasts the existing global state.
   */
  function syncGlobalState() {
    multiUser?.controller.current?.publish(
      props.topicHeader,
      JSON.stringify(globalState),
      false
    );
  }

  return (
    <Context.Provider
      value={{
        globalStateRef,
        updateGlobalState,
        syncGlobalState,
        getCurrentTime,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}

export function useGlobalState() {
  return useContext(Context);
}

