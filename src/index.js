// require("dotenv").config();
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: "./env",
});

connectDB()
    .then(() => {
        //! remove this later
        app.get("/justForFun", (req, res) => {
            res.send(`Howdy, i hacked you!!  your username is ${req.cookies.UserName}`);
        })
        app.listen(process.env.PORT || 8000, () => {
            console.log("Server is running at port ", process.env.PORT || 8000);
        });
    })
    .catch((error) => {
        console.log("MongoDB connection failed");
    });
