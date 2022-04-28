/** @param ns NS object */
export async function main(ns: NS): Promise<void> {
    ns.ls("home", "/tmp/").forEach((f) => ns.rm(f));
}
