import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
        cb(null, file.fieldname + "-" + uniqueSuffix)
        // cb(null, file.originalname);
    }
})

// main object from which we can manage files
export const upload = multer({ storage, })

// if you only wrote this line, it would work but the above code is used if you want to name the file, if you want to make it random, writing just below line works.
// const upload = multer({ dest: "./public/temp" });
