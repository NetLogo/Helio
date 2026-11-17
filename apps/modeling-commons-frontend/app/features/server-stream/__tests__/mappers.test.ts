import { describe, expect, it } from "vitest";
import { parseStreamMessage } from "~/features/server-stream/mappers";

describe("parseStreamMessage", () => {
  it("reads a topic message and a control message", () => {
    const comment = { topic: { type: "model", id: "m-1" }, event: "model_comment.created" };
    expect(parseStreamMessage(JSON.stringify(comment))).toEqual(comment);
    expect(parseStreamMessage('{"event":"resync"}')).toEqual({ event: "resync" });
  });

  it.each([["not json"], ['"text"'], ["null"], ['{"topic":{}}'], [undefined]])(
    "drops the unreadable data %s",
    (data) => {
      expect(parseStreamMessage(data)).toBeNull();
    },
  );
});
