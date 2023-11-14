import { connect, MqttClient } from "precompiled-mqtt";

export const STATE_CONNECTED = "Connected";
export const STATE_DISCONNECTED = "Disconnected";
export const STATE_RECONNECTED = "Reconnected";
export const STATE_OFFLINE = "Offline";

export type MqttResponse = {
    topic: string;
    message: string;
};

/**
 * Instance of MQTT client.
 * For brokers using WSS only.
 *
 * Provides 2 types of callbacks:
 * 1. Connection callback: Connection status to broker.
 * 2. Message callback: Messages received for topics subscribed.
 */
export class MqttController {
    private client: MqttClient | null = null;
    private connected: boolean = false;
    private connectionCallback: (status: string) => void;
    private messageCallback: (response: MqttResponse) => void;

    address: string = "";
    port: number = 8080;

    constructor(
        connectionCallback: (status: string) => void,
        messageCallback: (response: MqttResponse) => void
    ) {
        this.connectionCallback = connectionCallback;
        this.messageCallback = messageCallback;
    }

    /**
     * Connects to MQTT broker.
     * Setup address, port and topics before calling this.
     */
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
            this.messageCallback({
                topic: topic,
                message: new TextDecoder("utf-8").decode(message),
            });
        });
    }

    /**
     * Disconnects from MQTT broker.
     */
    public disconnect() {
        if (this.client == null) return;
        this.client.end(true);
        this.connectionCallback = () => {};
        this.messageCallback = () => {};
    }

    /**
     * Publishes message to specified topic.
     *
     * @param topic Topic to broadcast to
     * @param message Message to include
     * @param isRetain Whether message is one-time or retained
     */
    public publish(topic: string, message: string, isRetain: boolean) {
        this.client?.publish(topic, message, {
            qos: 1,
            retain: isRetain,
        });
    }

    /**
     * Subscribes to the specified topic.
     * All messages relating to this topic will be received in message callback.
     *
     * @param topic Topic to subscribe to
     * @returns
     */
    public subscribe(topic: string) {
        if (this.client == null) return;
        this.client.subscribe(topic);
    }

    /**
     * Unsubscribes from the specified topic.
     *
     * @param topic Topic to unsubscribe from
     * @returns
     */
    public unsubscribe(topic: string) {
        this.client?.unsubscribe(topic);
    }
}
