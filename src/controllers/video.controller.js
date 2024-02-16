import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
    uploadOnCloudinary,
    uploadToCloudinaryWithRetries,
} from "../utils/cloudinary.js";
import { exec } from "child_process";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

async function getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
        const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            const duration = parseFloat(stdout);
            resolve(duration);
        });
    });
}

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

    let duration = undefined;
    getVideoDuration('/home/mrprince/Programs/Backend/Project\ \(Advance\ backend\)/' + localVideoPath)
        .then((d) => {
            duration = d;
        })
        .catch((error) => {
            console.log(error);
        });

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
        duration: duration,
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
