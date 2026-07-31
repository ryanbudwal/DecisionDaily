import handler from "vinext/server/app-router-entry";

const worker = {
  fetch(request: Request, env: unknown, ctx: unknown) {
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
