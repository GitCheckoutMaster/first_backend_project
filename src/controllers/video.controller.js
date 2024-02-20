import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
    uploadOnCloudinary,
    uploadToCloudinaryWithRetries,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const uploadVideo = asyncHandler(async (req, res) => {
    //todo 1 -> get the files from req.files
    //todo 2 -> upload it on cloudinary
    //todo 3 -> update it on database (add cloudinary url on video database)
    //todo 4 -> return the response
    const localVideoPath = req.files?.videoFile[0]?.path;
    const localThumbnailPath = req.files?.thumbnail[0]?.path;
    const { title, description } = req.body;

    if (!localVideoPath) {
        throw new ApiError(401, "Video not found!");
    }
    if (!localThumbnailPath) {
        throw new ApiError(401, "Thumbnail not found!");
    }
    if (!title || !description) {
        throw new ApiError(401, "Title or description not found!");
    }

    const uploadVideo =
        await uploadToCloudinaryWithRetries(localVideoPath);
    const uploadThumbnail = await uploadOnCloudinary(localThumbnailPath);

    if (!uploadVideo?.url) {
        throw new ApiError(501, "Video not uploaded!");
    }
    if (!uploadThumbnail?.url) {
        throw new ApiError(501, "Thumbnail not uploaded!");
    }

    const videoDocument = await Video.create({
        videoFile: uploadVideo.url,
        thumbnail: uploadThumbnail.url,
        title: title,
        description: description,
        duration: uploadVideo.duration,
        views: 0,
        isPublished: true,
        owner: new mongoose.Types.ObjectId(req.user._id),
    });

    if (!videoDocument) {
        throw new ApiError(501, "Video data not created!!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, videoDocument, "Video uploaded successfully!")
        );
});

export { uploadVideo };
