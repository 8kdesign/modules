/**
 * Module for communication between multiple devices.
 * Offers 2 modes:
 * 1. RPC - Call functions on another device.
 * 2. Global State - Maintain a global state on all devices.
 * @module communications
 * @author Chong Wen Hao
 */
export {
  STATE_CONNECTED,
  STATE_DISCONNECTED,
  STATE_RECONNECTED,
  STATE_OFFLINE,
} from "./MqttController";
export { createMultiUser } from "./MultiUserController";
export { createGlobalState } from "./GlobalStateController";
export { createRpc } from "./RpcController";
