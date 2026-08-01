import handler from "vinext/server/app-router-entry";

type WorkerEnvironment = Parameters<typeof handler.fetch>[1];
type WorkerExecutionContext = Parameters<typeof handler.fetch>[2];

const worker = {
  fetch(request: Request, env: WorkerEnvironment, ctx: WorkerExecutionContext) {
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
