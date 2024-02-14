import { Router } from "express";
import {
    changeCurrentPassword,
    getCurrUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logoutUser,
    refreshTokens,
    registerUser,
    updateAccountDetails,
    updateAvtar,
    updateCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/authentication.middleware.js";

const userRouter = Router();

// upload is a middleware, so if you want to use a middleware, you can add it just before registerUser.
// middleware usually adds object to request field, in this case it addes access to files via request.files
userRouter.route("/register").post(
    upload.fields([
        { name: "avtar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser
);

userRouter.route("/login").post(loginUser);

// secured routes: means you need to be logged in to use this
userRouter.route("/logout").post(verifyJWT, logoutUser);
userRouter.route("/refresh-token").post(refreshTokens);
userRouter.route("/changePassword").post(verifyJWT, changeCurrentPassword);
userRouter.route("/getCurrentUser").get(verifyJWT, getCurrUser);
userRouter.route("/updateAccountDetails").patch(verifyJWT, updateAccountDetails);
userRouter
    .route("/updateAvtar")
    .patch(verifyJWT, upload.single("avtar"), updateAvtar);
userRouter
    .route("/updateCoverImage")
    .post(verifyJWT, upload.single("coverImage"), updateCoverImage);
userRouter.route("/c/:username").get(verifyJWT, getUserChannelProfile);
userRouter.route("/getWatchHistory").get(verifyJWT, getWatchHistory);

export default userRouter;
