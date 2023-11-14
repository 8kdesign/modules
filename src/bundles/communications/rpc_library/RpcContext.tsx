import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import uniqid from "uniqid";
import { useMultiUser } from "../communication_core_library/MultiUserContext";
import {
  type MqttResponse,
  STATE_CONNECTED,
} from "../communication_core_library/MqttController";

type ContextType = {
  userId: string;
  expose: (name: string, func: (...args: any[]) => any) => void;
  callFunction: (
    receiver: string,
    name: string,
    args: any[],
    callback: (args: any[]) => void
  ) => void;
};

const Context = createContext<ContextType>({
  userId: "",
  expose: () => {},
  callFunction: () => {},
});

type DeclaredFunction = {
  name: string;
  func: (...args: any[]) => any;
};

type Props = {
  topicHeader: string;
  children: ReactNode;
  userId?: string;
};

/**
 * Parent component with rpc context.
 * Allows one device to call an exposed function on another device.
 *
 * Steps to use:
 * 1. Use 'expose' to create an exposed function on the callee device.
 * 2. Use 'callFunction' to call a function on the caller device.
 *
 * Components within it can call 'useMultiUser' to obtain this context.
 */
export default function RpcContext(props: Props) {
  const [userId] = useState(props.userId ? props.userId : uniqid());
  const multiUser = useMultiUser();
  const [functions] = useState(new Map<string, DeclaredFunction>());
  const pendingReturns = useRef(new Map<string, (args: any[]) => void>());
  const returnTopic = props.topicHeader + "_return/" + userId;

  useEffect(() => {
    multiUser.addMessageCallback("rpc", (response) => {
      parseResponse(response);
    });
  }, []);

  useEffect(() => {
    if (multiUser.connectionState === STATE_CONNECTED) {
      multiUser.controller.current?.subscribe(returnTopic);
    }
  }, [multiUser.connectionState]);

  /**
   * Creates a function that other devices can call.
   *
   * @param name Identifier for the function
   * @param func The function itself
   */
  function expose(name: string, func: (...args: any[]) => any) {
    let item = {
      name: name,
      func: func,
    };
    functions.set(name, item);
    let topic = props.topicHeader + "/" + userId + "/" + name;
    multiUser.controller.current?.subscribe(topic);
  }

  /**
   * Checks the type of response received, then parses and acts on it.
   *
   * 2 types of responses:
   * - Call response from caller to callee, will call the function
   * - Return response from callee to caller, will trigger the return callback
   *
   * @param response Response received from MQTT client
   */
  function parseResponse(response: MqttResponse) {
    let splitTopic = response?.topic.split("/");
    if (response.topic === returnTopic) {
      // Return
      let messageJson = JSON.parse(response.message);
      let callId = messageJson.callId;
      let callback = pendingReturns.current.get(callId);
      if (callback) {
        pendingReturns.current.delete(callId);
        callback(messageJson.result);
      }
      return;
    }
    if (
      splitTopic.length !== 3 ||
      splitTopic[0] !== props.topicHeader ||
      splitTopic[1] !== userId
    ) {
      return;
    }
    // Call
    let parsedMessage = JSON.parse(response.message);
    let callId = parsedMessage.callId;
    let sender = parsedMessage.sender;
    if (!callId || !sender) return;
    let name = splitTopic[2];
    let func = functions.get(name);
    if (!func) {
      returnResponse(sender, callId, null);
      return;
    }
    try {
      let args = parsedMessage.args;
      let result = func?.func(...args);
      returnResponse(sender, callId, result);
    } catch {
      returnResponse(sender, callId, null);
    }
  }

  /**
   * Broadcast the return value back to the caller.
   *
   * @param sender Identifier of the caller
   * @param callId Identifier for the function call
   * @param value Value returned by function, null if failed
   */
  function returnResponse(sender: string, callId: string, value: any) {
    let message = {
      callId: callId,
      result: value,
    };
    let topic = props.topicHeader + "_return/" + sender;
    multiUser.controller.current?.publish(
      topic,
      JSON.stringify(message),
      false
    );
  }

  /**
   * Calls the function on the callee.
   * To be used by caller.
   * Generates a random identifier for this instance of function call.
   *
   * @param receiver Identifier of the callee
   * @param name Identifier for function to call
   * @param args Array of arguments for the function call
   * @param callback Callback for receiving the return message
   */
  function callFunction(
    receiver: string,
    name: string,
    args: any[],
    callback: (args: any[]) => void
  ) {
    let topic = props.topicHeader + "/" + receiver + "/" + name;
    let callId = uniqid();
    pendingReturns.current.set(callId, callback);
    let messageJson = {
      sender: userId,
      callId: callId,
      args: args,
    };
    let messageString = JSON.stringify(messageJson);
    multiUser.controller.current?.publish(topic, messageString, false);
  }

  return (
    <Context.Provider
      value={{
        userId,
        expose,
        callFunction,
      }}
    >
      {props.children}
    </Context.Provider>
  );
}

export function useRpc() {
  return useContext(Context);
}

