import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { resetDatabase } from "@/lib/test-utils/db";
import { seed } from "./seed";

beforeEach(resetDatabase);

describe("seed", () => {
  it("loads data/rules.json and is idempotent", async () => {
    const count = await seed();
    await seed();

    expect(count).toBe(3);
    expect(await prisma.rule.count()).toBe(count);
  });
});
