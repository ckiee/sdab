import express from "express";
import { port, auth } from "./env";
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";
import { StrategyOptions } from "@octokit/auth-app/dist-types/types";
const octokit = new Octokit({
    authStrategy: createAppAuth,
    auth: {
        id: auth.APP_ID,
        privateKey: auth.PRIV_KEY,
        clientId: auth.CLIENT_ID,
        clientSecret: auth.CLIENT_SECRET,
    } as StrategyOptions,
});
const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
    res.sendStatus(200);
});

app.listen(port, () => console.log(`listening on ${port}`));
