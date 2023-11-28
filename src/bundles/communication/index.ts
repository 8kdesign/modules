/**
 * Module for communication between multiple devices.
 *
 * Offers 2 modes:
 * 1. RPC - Call functions on another device.
 * 2. Global State - Maintain a global state on all devices.
 *
 * @module communication
 * @author Chong Wen Hao
 */

/*
  To access things like the context or module state you can just import the context
  using the import below
 */
import context from "js-slang/context";
import { MultiUserController } from "./MultiUserController";
import { GlobalStateController } from "./GlobalStateController";
import { RpcController } from "./RpcController";

class CommunicationModuleState {
  multiUser: MultiUserController;
  globalState: GlobalStateController | null = null;
  rpc: RpcController | null = null;

  constructor(address: string, port: number) {
    let multiUser = new MultiUserController();
    multiUser.setupController(address, port);
    this.multiUser = multiUser;
  }
}

let moduleState = new CommunicationModuleState("broker.hivemq.com", 8884);
context.moduleContexts.communication.state = moduleState;

export {
  STATE_CONNECTED,
  STATE_DISCONNECTED,
  STATE_OFFLINE,
  STATE_RECONNECTED,
} from "./MqttController";

// Global State

export function initGlobalState(
  topicHeader: string,
  callback: (state: any) => {}
) {
  moduleState.globalState = new GlobalStateController(
    topicHeader,
    moduleState.multiUser,
    callback
  );
}

export function getGlobalState() {
  return moduleState.globalState?.globalState;
}

export function updateGlobalState(path: string, updatedState: any) {
  moduleState.globalState?.updateGlobalState(path, updatedState);
}

// Rpc

export function initRpc(topicHeader: string, userId?: string) {
  moduleState.rpc = new RpcController(
    topicHeader,
    moduleState.multiUser,
    userId
  );
}

export function expose(name: string, func: (...args: any[]) => any) {
  moduleState.rpc?.expose(name, func);
}

export function callFunction(
  receiver: string,
  name: string,
  args: any[],
  callback: (args: any[]) => void
) {
  moduleState.rpc?.callFunction(receiver, name, args, callback);
}
