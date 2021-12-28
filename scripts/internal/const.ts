import { resolve } from "path/posix";

export const INTERNAL_FOLDER = __dirname;
export const SCRIPTS_FOLDER = resolve(INTERNAL_FOLDER, "..");
export const SRCROOT = resolve(SCRIPTS_FOLDER, "..");