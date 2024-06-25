import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const channel = await User.findById(new mongoose.Types.ObjectId(channelId));
    if (!channel) {
        throw new ApiError(401, "Channel not found!!");
    }

    const isSubscribedAlready = await Subscription.findOneAndDelete({
        subscriber: req.user._id,
        channel: channelId,
    });

    if (isSubscribedAlready) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    isSubscribedAlready,
                    "Unsubscribed successfully!!"
                )
            );
    }

    const subscription = await Subscription.create({
        subscriber: req.user._id,
        channel: channelId,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, subscription, "Subscribed successfully!!"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $count: "matchedSubscribersCount"
        }
    ]);

    // console.log(subscribers);
    return res
        .status(200)
        .json(new ApiResponse(200, subscribers, "Subscribers featched successfully"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, "Invalid user ID"));
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: req.user._id,
            },
        },
        {
            $count: "matchedChannelsCount",
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribedChannels, "Subscribed channels featched successfully"));
});

export { toggleSubscription, getSubscribedChannels, getUserChannelSubscribers };
