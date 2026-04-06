import { auth } from "@clerk/tanstack-react-start/server";
import { os } from "@orpc/server";

export const authedProcedure = os.use(async ({ context, next }) => {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return next({ context: { ...context, userId } });
});
