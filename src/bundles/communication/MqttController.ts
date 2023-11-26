import { connect, MqttClient } from "mqtt";

export const STATE_CONNECTED = "Connected";
export const STATE_DISCONNECTED = "Disconnected";
export const STATE_RECONNECTED = "Reconnected";
export const STATE_OFFLINE = "Offline";

export class MqttController {
  private client: MqttClient | null = null;
  private connected: boolean = false;
  private connectionCallback: (status: string) => void;
  private messageCallback: (topic: string, message: string) => void;

  address: string = "";
  port: number = 8080;

  constructor(
    connectionCallback: (status: string) => void,
    messageCallback: (topic: string, message: string) => void
  ) {
    this.connectionCallback = connectionCallback;
    this.messageCallback = messageCallback;
  }

  public connectClient() {
    if (this.connected || this.address.length === 0) return;
    let link = "wss://" + this.address + ":" + this.port + "/mqtt";
    this.client = connect(link);
    this.connected = true;
    this.client.on("connect", () => {
      this.connectionCallback(STATE_CONNECTED);
    });
    this.client.on("disconnect", () => {
      this.connectionCallback(STATE_DISCONNECTED);
    });
    this.client.on("reconnect", () => {
      this.connectionCallback(STATE_RECONNECTED);
    });
    this.client.on("offline", () => {
      this.connectionCallback(STATE_OFFLINE);
    });
    this.client.on("message", (topic, message) => {
      this.messageCallback(topic, new TextDecoder("utf-8").decode(message));
    });
  }

  public disconnect() {
    if (this.client == null) return;
    this.client.end(true);
    this.connectionCallback = () => {};
    this.messageCallback = () => {};
  }

  public publish(topic: string, message: string, isRetain: boolean) {
    this.client?.publish(topic, message, {
      qos: 1,
      retain: isRetain,
    });
  }

  public subscribe(topic: string) {
    if (this.client == null) return;
    this.client.subscribe(topic);
    console.log("Subscribed", topic);
  }

  public unsubscribe(topic: string) {
    this.client?.unsubscribe(topic);
  }
}

