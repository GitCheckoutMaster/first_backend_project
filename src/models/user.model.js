import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true, // if you are using this field in serching, then index = true helps to optimize searching
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avtar: {
            type: String, // cloudinary url
            required: true,
        },
        coverImage: {
            type: String,
        },
        watchHistory: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        password: {
            type: String,
            required: [true, "Password is required!!"],
        },
        refreshToken: {
            type: String,
        },
    },
    { timestamps: true }
);

// password should be encrypted, so here is the code to encrypt the password as user changes or adds new password
// pre is a middleware that stops the process temprarily and performs given function and then does the work it was doing before (in this case saving the data)
userSchema.pre("save", async function(next) {
    if (!userSchema.isModified("password")) {
        return next();
    }
    // encrytp this.password in 10 rounds, if you change the round, encrypted password will change.
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// create a custome method in userSchema to check if provided password is correct or not
userSchema.methods.isPasswordCorrect = async function(pass) {
    return await bcrypt.compare(pass, this.password);
}

// generate tokens for GOD-KNOWS-WHY (he said he'll explain it later)
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            // this is some kind of payload, it is just a fancy name for data
            _id: this._id, // id is generated in data by default by mongoDB (primary key)
            email: this.email,
            username: this.username,
            fullname: this.fullname,
        },
        // read the token if you dont know what this is
        process.env.ACCESS_TOKEN_SECRET,
        {
            // when will token expires, i dont know why it is passed in object
            // but it is what it is
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
}

// generate refresh token for again GOD-KNOWS-WHY and GOD-KNOWS-WHAT-IS-IT!! (again he said he'll explain it later)
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        // read the token if you dont know what this is
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
}

export const User = mongoose.model("User", userSchema);
