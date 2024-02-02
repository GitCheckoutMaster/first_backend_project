import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
    const temp = res.status(200).json({
        message: "ok",
    });
    // console.log(temp);
    return temp;
});

export { registerUser };
