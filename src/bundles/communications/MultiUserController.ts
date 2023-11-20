import { MqttController, STATE_DISCONNECTED } from "./MqttController";

export class MultiUserController {
  controller: MqttController | null = null;
  connectionState: string = STATE_DISCONNECTED;
  messageCallbacks: Map<string, (topic: string, message: string) => void> =
    new Map();

  public setupController(address: string, port: number) {
    let currentController = this.controller;
    if (currentController !== null) {
      currentController.disconnect();
      this.connectionState = STATE_DISCONNECTED;
    } else {
      currentController = new MqttController(
        (status: string) => {
          this.connectionState = status;
          console.log(status);
        },
        (topic: string, message: string) => {
          this.messageCallbacks.forEach((callback) => {
            callback(topic, message);
          });
        }
      );
      this.controller = currentController;
    }
    currentController.address = address;
    currentController.port = port;
    currentController.connectClient();
  }

  public addMessageCallback(
    identifier: string,
    callback: (topic: string, message: string) => void
  ) {
    this.controller?.subscribe(identifier + "/#");
    this.messageCallbacks.set(identifier, callback);
  }
}

