const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        /*
        --> If the argument passed to Promise.resolve() is a Promise, it returns the same Promise.
        --> If the argument is not a Promise, it creates a new Promise that is immediately resolved with the provided non-Promise value.

        --> Basically if it is not a promise then it is of no use, it will just return a resolved promise but if argument evaluates in a promise then if the promise is rejected it will catched by catch function. So in short, it is in replace of trycatch block but in a fancy way to confuse others, huh, but not me....
        */
       
        Promise.resolve(requestHandler(req, res, next)).catch((error) =>
            next(error)
        );
        // temp.then((r) => {
        //     console.log(r);
        //     console.log("why is it resolving?");
        // })
        // return temp;
    };
};

export { asyncHandler };

// another way
// const asyncHandler = (func) => async (req, res, next) => {
//     try {
//         await func(req, res, next);
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }
