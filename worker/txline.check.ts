// Self-check for foldSnapshot / isFinished — the "stuck LIVE" regression.
// Run: npx tsx worker/txline.check.ts
import assert from "node:assert";
import { foldSnapshot, isFinished, isLive } from "../src/lib/txline.ts";

// Real-world case (Congo DR v Uzbekistan, fixture 17926704): final whistle at Seq 1111/1113,
// then a retroactive yellow-card amend at Seq 1115 carrying the in-play StatusId 4.
// The amend must NOT drag the state back from Finished to Second Half.
{
  const { gs } = foldSnapshot(
    [
      { Seq: 1110, StatusId: 4 },
      { Seq: 1111, StatusId: 5 },
      { Seq: 1113, StatusId: 5 },
      { Seq: 1115, StatusId: 4, Action: "action_amend" },
    ],
    1,
  );
  assert.strictEqual(gs, 5, `amend regressed state to ${gs}`);
}

// Real-world case (Australia v Egypt, fixture 18176123): pens end at 13, then an ET amend (9),
// then game_finalised (100). 100 must read as finished, never as a live/unknown state.
{
  const { gs } = foldSnapshot(
    [
      { Seq: 1350, StatusId: 13, Action: "status" },
      { Seq: 1351, StatusId: 9, Action: "action_amend" },
      { Seq: 1352, StatusId: 100, Action: "game_finalised" },
    ],
    1,
  );
  assert.strictEqual(gs, 100, `expected 100, got ${gs}`);
  assert.ok(isFinished(gs), "state 100 must be finished");
  assert.ok(!isLive(gs), "state 100 must not be live");
}

// Normal flow still folds to the newest status.
{
  const { gs } = foldSnapshot([{ Seq: 1, StatusId: 2 }, { Seq: 2, StatusId: 4 }], 1);
  assert.strictEqual(gs, 4);
}

console.log("txline.check: OK");
