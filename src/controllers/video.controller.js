import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import {
    deleteOnCloudinary,
    uploadOnCloudinary,
    uploadToCloudinaryWithRetries,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        query,
        sortBy = "publishDate",
        sortType = "asc",
        userId = undefined,
        page = 1,
        limit = 10,
    } = req.query;
    //TODO: get all videos based on query, sort, pagination
    //* return arrays of arrays of object [ page 1--> [ video 1--> {}, video 2-->{} .... 10 ], page 2-->[...] ... ]
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(401, "Give valid video id...");
    }
    //TODO: get video by id
    const video = await Video.findById(new mongoose.Types.ObjectId(videoId));

    if (!video) {
        throw new ApiError(401, "Video not found!!");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video got successfully.."));
});

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

    const uploadVideo = await uploadToCloudinaryWithRetries(localVideoPath);
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

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail
    const { description, title } = req.body;
    const thumbnailLocalPath = req.file?.path;

    // // get the video
    // const video = await Video.findByIdAndUpdate(
    //     new mongoose.Types.ObjectId(videoId),
    //     {
    //         ...(description !== undefined ? {$set: {description: description}} : {}),
    //         ...(title !== undefined ? {$set: {title: title}}: {})
    //     }
    // );

    // get the video
    const video = await Video.findById(new mongoose.Types.ObjectId(videoId));
    if (description) {
        video.description = description;
    }
    if (title) {
        video.title = title;
    }
    if (thumbnailLocalPath) {
        await deleteOnCloudinary(video.thumbnail);
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        video.thumbnail = thumbnail.url;
    }
    video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully!!"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video
    const video = await Video.findById(new mongoose.Types.ObjectId(videoId));

    if (!video) {
        throw new ApiError(401, "Video not found!!");
    }

    await deleteOnCloudinary(video.videoFile);

    try {
        await Video.deleteOne({ _id: videoId });
    } catch (error) {
        console.log(
            "Error while deleting video on mongoose database!! Error: ",
            error
        );
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully!!"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await Video.findById(new mongoose.Types.ObjectId(videoId));
    video.isPublished = !video.isPublished;
    await video.save();

    if (!video) {
        throw new ApiError(401, "Video not found!!");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "publish status toggeled successfully!!"
            )
        );
});

export {
    uploadVideo,
    getAllVideos,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
