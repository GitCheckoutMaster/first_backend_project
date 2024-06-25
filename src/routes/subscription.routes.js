import { Router } from "express";
import { getUserChannelSubscribers, toggleSubscription, getSubscribedChannels } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/authentication.middleware.js";

const subscriptionRouter = Router();
subscriptionRouter.use(verifyJWT);

subscriptionRouter.route("/toggleSubscription/:channelId").get(toggleSubscription);
subscriptionRouter.route("/getUserChannelSubscribers/:channelId").get(getUserChannelSubscribers);
subscriptionRouter.route("/getSubscribedChannels").get(getSubscribedChannels);

export default subscriptionRouter;
