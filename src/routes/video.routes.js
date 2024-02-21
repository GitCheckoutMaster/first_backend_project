import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/authentication.middleware.js";
import {
    deleteVideo,
    getVideoById,
    togglePublishStatus,
    updateVideo,
    uploadVideo,
} from "../controllers/video.controller.js";

const videoRouter = Router();
videoRouter.use(verifyJWT);

videoRouter.route("/").post(
    verifyJWT,
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    uploadVideo
);

videoRouter
    .route("/:videoId")
    .get(getVideoById)
    .patch(upload.single("thumbnail"), updateVideo)
    .delete(deleteVideo);

videoRouter.route("/togglePublishStatus/:videoId").get(togglePublishStatus);

export default videoRouter;
