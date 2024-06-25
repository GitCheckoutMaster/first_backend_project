import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

async function generateAccessAndRefreshToken(userId) {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        // this argument is because we dont want to authenticate when we do this, because we are doing this and it is safe
        user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}

// my first register user controller
//todo Step 1: Get the information from user through HTML form
//todo Step 2: Validate if needed
//todo Step 3: Check if the user already exists in database or not
//todo Step 4: Upload images or files to cloudinary
//todo Step 5: Store data in mongoDB
const registerUser = asyncHandler(async (req, res) => {
    // console.log("Body of request: ", req.body);
    const { username, email, fullname, password } = req.body; // step 1

    // step 2
    if (
        [fullname, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        // if something is empty then throw an error (api error that we created before)
        throw new ApiError(400, "All fields are required");
    }

    // check if user already exists or not in db: step 3
    const exists = await User.findOne({
        $or: [{ username }, { email }], // if one of these two already exists it will return something
    });

    // check if the image is there or not, and if they are there then upload it to cloudinary: step 4
    const avtarLocalPath = req.files?.avtar[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avtarLocalPath) {
        throw new ApiError(400, "Avtar file is required!");
    }

    const avtar = await uploadOnCloudinary(avtarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (exists) {
        // moved it here because if it was there (where it was before) then if the user already exists then image wont be deteled because program stops just there and deletion of image is while uploading it.
        throw new ApiError(400, "Username or email already exists");
    }

    if (!avtar) {
        throw new ApiError(500, "Avtar uploading problem!");
    }

    // now create a user entry and add it into database
    const user = await User.create({
        username: username,
        email: email,
        fullname: fullname,
        avtar: avtar.url,
        coverImage: coverImage?.url || "",
        password: password,
    });

    // now check if the user is really created or not, if it is then return it with response without password and refreshToken
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!createdUser) {
        throw new ApiError(500, "User is not stored!");
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered successfully!!")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    //todo Get data like, username, email, password
    //todo Check if password is correct or not
    //todo Generate access and refresh token and give them to user by cookies

    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        throw new ApiError(400, "Invalid username, email or password");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(400, "User not found");
    }

    const passwordValidation = await user.isPasswordCorrect(password);
    if (!passwordValidation) {
        throw new ApiError(400, "Password is incorrect!");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    // get user to return it as response and dont sent password and refresh token
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // this is because we dont want that frontend can modify it directly
    // with this only server can modify cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("AccessToken", accessToken, options)
        .cookie("RefreshToken", refreshToken, options)
        .cookie("UserName", user.username, options) // just for fun, i'll remove this later
        .json(
            new ApiResponse(200, loggedInUser, "User logged in successfully!")
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    // to logout we need to do 2 things first is to clear tokens and second is to clear cookies
    // but we do not have access to user, so we created a middleware authentication.middleware.js just to seperate code, that could be written here as well but it would make things messy...
    User.findByIdAndUpdate(
        req.user._id,
        {
            // $set: { refreshToken: undefined },
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("AccessToken", options)
        .clearCookie("RefreshToken", options)
        .clearCookie("UserName", options)
        .json(new ApiResponse(200, {}, "User logged out successfully!!"));
});

//* this function is used when user's access token expires, if you dont understand the concept of tokens then see video of "what is access and refresh tokens"
const refreshTokens = asyncHandler(async (req, res) => {
    // this is a secured route, means only loggedin user can access it
    // and if user is loggedin then there are cookies of access and refresh tokens
    const oldRefreshToken = req.cookie?.RefreshToken || req.body.RefreshToken;

    if (!oldRefreshToken) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // see what decoded information looks like in User.generateRefreshToken function
    const decodedOldRefreshToken = jwt.verify(
        oldRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedOldRefreshToken) {
        throw new ApiError(
            401,
            "Something went wrong while decoding refreshToken"
        );
    }

    // get the user with id
    const user = await User.findById(decodedOldRefreshToken._id);
    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    // means we found the user, then we check if the user's refresh token and the refresh token we got from cookie is equal or not
    if (oldRefreshToken != user.refreshToken) {
        throw new ApiError(401, "Invalid refresh token");
    }

    const { newAccessToken, newRefreshToken } =
        await generateAccessAndRefreshToken(user._id);

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("AccessToken", newAccessToken, options)
        .cookie("RefreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                { newAccessToken, newRefreshToken },
                "Refreshed Successfully!!"
            )
        );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPass, newPass } = req.body;

    const user = await User.findById(req.user._id);
    const passwordAuth = await user.isPasswordCorrect(oldPass);
    if (!passwordAuth) {
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPass;
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;

    if (!fullname || !email) {
        throw new ApiError(401, "All fields are required!");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { fullname, email },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Fullname and email updated successfully!"
            )
        );
});

const updateAvtar = asyncHandler(async (req, res) => {
    const avtarLocalPath = req.file?.path;

    if (!avtarLocalPath) {
        throw new ApiError(401, "Avtar file is missing");
    }

    const uploadedAvtar = await uploadOnCloudinary(avtarLocalPath);

    if (!uploadedAvtar.url) {
        throw new ApiError(400, "Error while uploading...");
    }

    // const user = User.findByIdAndUpdate(
    //     req.user._id,
    //     {
    //         $set: {
    //             avtar: uploadedAvtar.url,
    //         },
    //     },
    //     { new: true }
    // ).select("-password");

    const user = await User.findById(req.user._id).select("-password");
    const check = await deleteOnCloudinary(user.avtar);
    if (!check) {
        console.log("Avrtar isn't deleted!");
    }

    user.avtar = uploadedAvtar.url;
    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avtar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(401, "cover image file is missing");
    }

    const uploadedcoverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!uploadedcoverImage.url) {
        throw new ApiError(400, "Error while uploading...");
    }

    // const user = User.findByIdAndUpdate(
    //     req.user._id,
    //     {
    //         $set: {
    //             coverImage: uploadedcoverImage.url,
    //         },
    //     },
    //     { new: true }
    // ).select("-password");
    const user = await User.findById(req.user._id).select("-password");
    const check = await deleteOnCloudinary(user.coverImage);
    if (!check) {
        console.log("Cover image isn't deleted!");
    }

    user.coverImage = uploadedcoverImage.url;
    await user.save();
    return res
        .status(200)
        .json(new ApiResponse(200, user, "cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    // to get values from url
    const { username } = req.params; // this is real
    // const {username} = req.query;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing!");
    }

    // User.find({username})
    const channel = await User.aggregate([
        {
            // first pipeline: this filters all user that have username = given username, and give it to next pipeline
            $match: {
                username: username.toLowerCase(),
            },
        },
        {
            // second pipeline: count subscribers
            $lookup: {
                from: "subscriptions", // from where to get
                localField: "_id", // what is the local field (in current ducoment) to find in foreign document
                foreignField: "channel", // field in another document to find to
                as: "subscribers", // new field to be added in current document, which is an array of objects and first object is the data we found which matches as localfield and foreign field
            },
        },
        {
            // third pipeline: find subscribed to
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            // fourth pipeline: add some more fields
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers", // user doller sign for fields
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            // fifth pipeline: select which pipeline to display
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avtar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists.");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully!"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    // get current user's watch history
    const user = await User.aggregate([
        {
            // find current user
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id), // because it is an object and req.user._id gives an string
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                        },
                    },
                    {
                        // if this second pipeline dosen't work then put it in the first pipeline as nested pipeline just like above...
                        $project: {
                            fullname: 1,
                            username: 1,
                            avtar: 1,
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully!"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshTokens,
    changeCurrentPassword,
    getCurrUser,
    updateAccountDetails,
    updateAvtar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
