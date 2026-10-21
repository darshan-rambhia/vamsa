import { defineCommand } from "citty";
import { GLOBAL_ARGS } from "../lib/context";
import { login, logout, whoami } from "./auth";
import { homeView } from "./home";
import { person } from "./person";
import { profile } from "./profile";
import { relationship } from "./relationship";
import { token } from "./token";
import type { Ctx } from "../lib/context";

export const rootCommand = defineCommand({
  meta: {
    name: "vamsa",
    description: "Command-line client for a Vamsa family tree",
  },
  args: GLOBAL_ARGS,
  subCommands: {
    login,
    logout,
    whoami,
    profile,
    token,
    person,
    relationship,
  },
  run: async (c) => homeView(c.data as Ctx),
});
