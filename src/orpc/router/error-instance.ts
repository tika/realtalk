import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { errorInstance } from "#/db/schema";

// given an error id, return the error instance
export const getErrorInstance = os
  .input(
    z.object({
      id: z.uuid(),
    })
  )
  .handler(async ({ input }) => await db
      .select()
      .from(errorInstance)
      .where(eq(errorInstance.id, input.id)));

// get all error instances for a given story id
export const getErrorInstancesForStory = os
  .input(
    z.object({
      storyId: z.uuid(),
    })
  )
  .handler(async ({ input }) => await db
      .select()
      .from(errorInstance)
      .where(eq(errorInstance.storyId, input.storyId)));
