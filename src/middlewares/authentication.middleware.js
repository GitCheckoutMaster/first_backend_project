import { User } from "../models/user.model";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";

// const verifyJWT = asyncHandler(async (req, res, next) => {
// if res or any argument is not in use then we can replce it with underscore to ignore it
export const verifyJWT = asyncHandler(async (req, _, next) => {
     const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

     if (!accessToken) {
        throw new ApiError(401, "Unauthorized access!");
     }

     const decodedAccessToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

     const user = await User.findById(decodedAccessToken._id).select("-password -refreshToken");

     if (!user) {
        throw new ApiError(401, "Invalid access token!");
     }
     req.user = user;
     next();
});
