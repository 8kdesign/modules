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

import uniqid from "uniqid";

// Try removing this line and it works.
import { connect, MqttClient } from "mqtt";

/**
 * Sample function. Increments a number by 1.
 *
 * @param x The number to be incremented.
 * @returns The incremented value of the number.
 */
export function sample_function1(x: number): string {
  return uniqid();
} // Then any functions or variables you want to expose to the user is exported from the bundle's index.ts file
