import { MultiUserController } from "./MultiUserController";
import uniqid from "uniqid";

type DeclaredFunction = {
  name: string;
  func: (...args: any[]) => any;
};

export function createRpc(
  topicHeader: string,
  multiUser: MultiUserController,
  userId?: string
) {
  return new RpcController(topicHeader, multiUser, userId);
}

export class RpcController {
  private topicHeader: string;
  private multiUser: MultiUserController;
  private userId: string;
  private functions = new Map<string, DeclaredFunction>();
  private pendingReturns = new Map<string, (args: any[]) => void>();
  private returnTopic: string;

  constructor(
    topicHeader: string,
    multiUser: MultiUserController,
    userId?: string
  ) {
    this.topicHeader = topicHeader;
    this.multiUser = multiUser;
    this.userId = userId ?? uniqid();
    console.log("UserID: ", this.userId);
    this.returnTopic = this.topicHeader + "_return/" + this.userId;
    this.setupRpc();
  }

  private setupRpc() {
    this.multiUser.addMessageCallback(this.returnTopic, (topic, message) => {
      if (topic === this.returnTopic) {
        // Return
        let messageJson = JSON.parse(message);
        let callId = messageJson.callId;
        let callback = this.pendingReturns.get(callId);
        if (callback) {
          this.pendingReturns.delete(callId);
          callback(messageJson.result);
        }
        return;
      }
      // Call
      let splitTopic = topic.split("/");
      if (
        splitTopic.length !== 3 ||
        splitTopic[0] !== this.topicHeader ||
        splitTopic[1] !== this.userId
      ) {
        return;
      }
      let parsedMessage = JSON.parse(message);
      let callId = parsedMessage.callId;
      let sender = parsedMessage.sender;
      if (!callId || !sender) return;
      let name = splitTopic[2];
      let func = this.functions.get(name);
      if (!func) {
        this.returnResponse(sender, callId, null);
        return;
      }
      try {
        let args = parsedMessage.args;
        let result = func?.func(...args);
        this.returnResponse(sender, callId, result);
      } catch {
        this.returnResponse(sender, callId, null);
      }
    });
  }

  private returnResponse(sender: string, callId: string, value: any) {
    let message = {
      callId: callId,
      result: value,
    };
    let topic = this.topicHeader + "_return/" + sender;
    this.multiUser.controller?.publish(topic, JSON.stringify(message), false);
  }

  public expose(name: string, func: (...args: any[]) => any) {
    let item = {
      name: name,
      func: func,
    };
    this.functions.set(name, item);
    let topic = this.topicHeader + "/" + this.userId + "/" + name;
    this.multiUser.controller?.subscribe(topic);
  }

  public callFunction(
    receiver: string,
    name: string,
    args: any[],
    callback: (args: any[]) => void
  ) {
    let topic = this.topicHeader + "/" + receiver + "/" + name;
    let callId = uniqid();
    this.pendingReturns.set(callId, callback);
    let messageJson = {
      sender: this.userId,
      callId: callId,
      args: args,
    };
    let messageString = JSON.stringify(messageJson);
    this.multiUser.controller?.publish(topic, messageString, false);
  }
}

