import assert from "node:assert/strict";
import { test } from "node:test";

import { durationFor, easeOut, frameValue, parseStatValue } from "../src/lib/countUp.js";

test("the number inside a display string is found, prefix and suffix kept", () => {
  // The API is explicit that `value` is "a display string, not a number to
  // compute with" — and the live data is 25+, 1000+, 64, 100%.
  assert.deepEqual(parseStatValue("25+"), { prefix: "", number: 25, suffix: "+", decimals: 0 });
  assert.deepEqual(parseStatValue("1000+"), { prefix: "", number: 1000, suffix: "+", decimals: 0 });
  assert.deepEqual(parseStatValue("64"), { prefix: "", number: 64, suffix: "", decimals: 0 });
  assert.deepEqual(parseStatValue("100%"), { prefix: "", number: 100, suffix: "%", decimals: 0 });
});

test("a leading symbol survives the count", () => {
  assert.deepEqual(parseStatValue("৳450"), { prefix: "৳", number: 450, suffix: "", decimals: 0 });
  assert.deepEqual(parseStatValue("$1,200+"), { prefix: "$", number: 1200, suffix: "+", decimals: 0 });
});

test("decimals are preserved so 4.8 does not become 5", () => {
  const parsed = parseStatValue("4.8");
  assert.equal(parsed.number, 4.8);
  assert.equal(parsed.decimals, 1);
  assert.equal(frameValue("4.8", 1), "4.8");
});

test("a value with no digits is left exactly as written", () => {
  // Rather than becoming NaN, which is what a naive Number() would produce.
  for (const value of ["Always", "—", "", null, undefined]) {
    assert.equal(parseStatValue(value), null, `${value} should not parse`);
    assert.equal(frameValue(value, 0.5), String(value ?? ""));
    assert.equal(durationFor(value), 0, "and it should not animate at all");
  }
});

test("the animation starts at zero and lands exactly on the target", () => {
  assert.equal(frameValue("1000+", 0), "0+");
  assert.equal(frameValue("1000+", 1), "1000+");
  assert.equal(frameValue("100%", 1), "100%");
});

test("a late frame cannot overshoot", () => {
  // requestAnimationFrame can hand back a timestamp past the end; without the
  // clamp the number would sail past the real figure and snap back.
  assert.equal(frameValue("64", 1.4), "64");
  assert.equal(easeOut(2), 1);
  assert.equal(easeOut(-1), 0);
});

test("easing moves fast then settles", () => {
  // Linear counting reads as a machine ticking. Halfway through the time
  // should be well past halfway through the number.
  assert.ok(easeOut(0.5) > 0.8, `halfway eased to ${easeOut(0.5)}`);
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
});

test("every intermediate frame is a readable string, never NaN", () => {
  for (const value of ["25+", "1000+", "100%", "৳450", "4.8"]) {
    for (const progress of [0, 0.1, 0.33, 0.7, 0.99, 1]) {
      const frame = frameValue(value, progress);
      assert.doesNotMatch(frame, /NaN|undefined/, `${value} at ${progress} gave ${frame}`);
    }
  }
});

test("a bigger number gets longer, but not unboundedly", () => {
  // Counting 1000 at the same speed as 25 either crawls or flickers.
  assert.ok(durationFor("1000+") > durationFor("25+"));
  assert.ok(durationFor("999999999") <= 1600, "capped so a huge stat does not crawl");
});
