import dotenv from "dotenv";
dotenv.config();

export const port = process.env.PORT || 3000;
export const auth = {
    APP_ID: parseInt(process.env.APP_ID || "0", 10),
    PRIV_KEY: process.env.PRIV_KEY || "",
    CLIENT_ID: process.env.CLIENT_ID || "",
    CLIENT_SECRET: process.env.CLIENT_SECRET || "",
};
export const repos = (process.env.REPOS || "").split(",").map((x) => {
    let [owner, repo] = x.split("/");
    return { owner, repo };
});
