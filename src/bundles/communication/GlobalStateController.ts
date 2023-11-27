import { MultiUserController } from "./MultiUserController";

export function createGlobalState(
  topicHeader: string,
  multiUser: MultiUserController
) {
  return new GlobalStateController(topicHeader, multiUser);
}

export class GlobalStateController {
  private topicHeader: string;
  private multiUser: MultiUserController;
  globalState: any;

  constructor(topicHeader: string, multiUser: MultiUserController) {
    this.topicHeader = topicHeader;
    this.multiUser = multiUser;
    this.setupGlobalState();
  }

  private setupGlobalState() {
    if (this.topicHeader.length <= 0) return;
    this.multiUser.addMessageCallback("global-state-demo", (topic, message) => {
      let splitTopic = topic.split("/");
      if (splitTopic.length < 1 || splitTopic[0] !== this.topicHeader) {
        return;
      }
      if (splitTopic.length === 1) {
        try {
          this.setGlobalState(JSON.parse(message ?? "{}"));
        } catch {
          this.setGlobalState({});
        }
        return;
      }
      try {
        let newGlobalState = Object.assign({}, this.globalState);
        if (
          this.globalState instanceof Array ||
          typeof this.globalState === "string"
        ) {
          newGlobalState = {};
        }
        let currentJson = newGlobalState;
        for (let i = 1; i < splitTopic.length - 1; i++) {
          let subTopic = splitTopic[i];
          if (
            !(currentJson[subTopic] instanceof Object) ||
            currentJson[subTopic] instanceof Array ||
            typeof currentJson[subTopic] === "string"
          ) {
            currentJson[subTopic] = {};
          }
          currentJson = currentJson[subTopic];
        }
        let jsonMessage = JSON.parse(message ?? "{}");
        if (!jsonMessage) {
          delete currentJson[splitTopic[splitTopic.length - 1]];
        } else {
          currentJson[splitTopic[splitTopic.length - 1]] = jsonMessage;
        }
        this.setGlobalState(newGlobalState);
      } catch {}
    });
  }

  private setGlobalState(newState: any) {
    this.globalState = newState;
    console.log(newState);
  }

  public updateGlobalState(path: string, updatedState: any) {
    if (this.topicHeader.length === 0) return;
    let topic = this.topicHeader;
    if (path.length !== 0 && !path.startsWith("/")) {
      topic += "/";
    }
    topic += path;
    this.multiUser.controller?.publish(
      topic,
      JSON.stringify(updatedState),
      false
    );
  }
}

