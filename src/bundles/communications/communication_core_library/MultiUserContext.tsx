import {
  type ReactNode,
  createContext,
  createRef,
  useContext,
  useRef,
  useState,
} from "react";
import {
  MqttController,
  type MqttResponse,
  STATE_DISCONNECTED,
} from "./MqttController";

type ContextType = {
  setupController: (address: string, port: number) => void;
  addMessageCallback: (
    identifier: string,
    callback: (response: MqttResponse) => void
  ) => void;
  controller: React.MutableRefObject<MqttController | null>;
  connectionState: string;
};

const Context = createContext<ContextType>({
  setupController: () => {},
  addMessageCallback: () => {},
  controller: createRef(),
  connectionState: STATE_DISCONNECTED,
});

type Props = {
  children: ReactNode;
};

/**
 * Parent component with multi user context.
 * Allows for communication over MQTT.
 *
 * Steps to use:
 * 1. Call 'setupController' with address and port of MQTT broker.
 * 2. Add message callback to receive responses using 'addMessageCallback'.
 * 3. Check topic and parse message received.
 *
 * Components within it can call 'useMultiUser' to obtain this context.
 */
export function MultiUserContext(props: Props) {
  const controller = useRef<MqttController | null>(null);
  const [connectionState, setConnectionState] = useState(STATE_DISCONNECTED);
  const messageCallbacks = useRef<
    Map<string, (response: MqttResponse) => void>
  >(new Map());

  /**
   * Initializes MQTT client.
   * MQTT broker must be using WSS.
   *
   * @param address Address of MQTT broker
   * @param port Websocket port of MQTT broker
   */
  function setupController(address: string, port: number) {
    let currentController = controller.current;
    if (currentController !== null) {
      currentController.disconnect();
      setConnectionState(STATE_DISCONNECTED);
    } else {
      currentController = new MqttController(
        (status: string) => {
          setConnectionState(status);
        },
        (response: MqttResponse) => {
          messageCallbacks.current.forEach((callback) => {
            callback(response);
          });
        }
      );
      controller.current = currentController;
    }
    currentController.address = address;
    currentController.port = port;
    currentController.connectClient();
  }

  /**
   * Adds a callback, to be called when a message is received.
   * Does not check who the message is for.
   *
   * @param callback Callback called for any message.
   */
  function addMessageCallback(
    identifier: string,
    callback: (response: MqttResponse) => void
  ) {
    messageCallbacks.current.set(identifier, callback);
  }

  return (
    <Context.Provider
      value={{
        setupController,
        addMessageCallback,
        controller,
        connectionState,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}

export function useMultiUser() {
  return useContext(Context);
}

