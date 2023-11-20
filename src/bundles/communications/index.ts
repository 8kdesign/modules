/**
 * Module for communication between multiple devices.
 * Offers 2 modes:
 * 1. RPC - Call functions on another device.
 * 2. Global State - Maintain a global state on all devices.
 * @module communications
 * @author Chong Wen Hao
 */
export * from "./MqttController";
export * from "./MultiUserController";
export * from "./GlobalStateController";
export * from "./RpcController";
