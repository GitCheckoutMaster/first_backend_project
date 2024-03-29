import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // file system: comes by default with node.js

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// this function runs only if the file is brought in this machine (server) by multer, the code we just wrote in middlewares/multer.middleware.js  -> that file brings the uploaded file in our local machine and that path (/public/temp) is goes in localFilePath argument.
// and this function is used to upload that file to cloudinary, because we dont wanna store so many file to local machine, you dont have that much space.
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            console.log("here we are and path is this: ", localFilePath);
            return null;
        }
        // upload the file
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        // file has been uploaded successfully now delete in local files
        fs.unlinkSync(localFilePath);

        return response;
    } catch (error) {
        // file is not uploaded to cloudinary, but it is in our server, so we need to delete it.
        console.log(error);
        fs.unlinkSync(localFilePath);
        return null;
    }
};

//! delete after using it once or twice
const uploadToCloudinaryWithRetries = async (localFilePath, maxRetries = 3, retryDelay = 1000) => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            // Upload the video file to Cloudinary
            const response = await cloudinary.uploader.upload(localFilePath, {
                resource_type: "video",
            });

            // Delete the local file after successful upload
            fs.unlinkSync(localFilePath);

            console.log("Video uploaded successfully:", response.secure_url);
            return response;
        } catch (error) {
            console.error(
                "Error uploading video to Cloudinary:",
                error.message
            );
            retries++;
            if (retries < maxRetries) {
                console.log(
                    `Retrying upload (attempt ${retries} of ${maxRetries}) in ${retryDelay} ms...`
                );
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
            } else {
                console.error("Max retries exceeded. Upload failed.");
                return null;
            }
        }
    }
};


const deleteOnCloudinary = async (url) => {
    // extract public id of photo from url
    // let publicId = "";
    // for (let i = 0; i < url.length; i++) {
    //     publicId += url[i];
    //     if (url[i] == "/") {
    //         publicId = "";
    //     }
    // }
    const publicId = url.split("/").pop().split(".")[0];

    await cloudinary.uploader.destroy(publicId).catch((error) => {
        console.log("something went wrong while deleting file on cloudinary. ERROR", error);
        return false;
    });
    return true;
};

export { uploadOnCloudinary, deleteOnCloudinary, uploadToCloudinaryWithRetries };
