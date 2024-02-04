import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
