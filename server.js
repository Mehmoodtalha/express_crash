const express = require('express');
const path = require("path");
const pool = require("./db");



const app = express();
app.use(express.json());
app.listen(8000, () => console.log("server is running on port 3000"));

///////it will just print in browser
// app.get("/", (req, res) => {
//     res.send("Hello world")
// });


////////it will print in json format in browser
// app.get("/", (req, res) => {
//     res.send({ message: "hellow worldjk" });
// });

/////////costom route
// app.get("/about", (req, res) => {
//     res.send("yeas its about");
// });


////////it will send file to browser
// app.get("/", (req, res) => {
//     res.sendFile(path.join(__dirname, "public", "index.html"));

//     // send({ message: "hellow worldjk" });
// });

////////static route
// app.use(express.static(path.join(__dirname, "public")));

////////first api with json
// let posts = [
//     { id: 7, title: "this is title 1", desc: "this is description 1" },

//     { id: 1, title: "this is title 1", desc: "this is description 1" },
//     { id: 2, title: "this is title 2", desc: "this is description 2" },
//     { id: 3, title: "this is title 3", desc: "this is description 3" }
// ]
//////////////get all posts with out db/////////////
// app.get("/api/posts", (req, res) => {
//     res.json(posts);
// });
//////////////get all posts with db//////////////////
app.get("/api/posts", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM posts ORDER BY id ASC");
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch posts" });
    }
});
////////////////////////////////////////////////////////////

app.get("/api/posts/:id", (req, res) => {
    const id = Number(req.params.id);
    console.log("🚀 ~ id:", id)
    res.json(posts.find((v) => v.id === id));
});
//////////////////// create post with out db/////////////////
// app.post("/api/post", (req, res) => {
//     const { id, title, desc } = req.body;
//     let post = posts.push({ id, title, desc });
//     console.log("🚀 ~ post:", post);
//     return res.json(posts);

// })

///////////////////create post with db//////////////////////

app.post("/api/post", async (req, res) => {
    try {
        console.log("body:", req.body);

        const { title, description } = req.body;

        const result = await pool.query(
            "INSERT INTO posts (title, description) VALUES ($1, $2) RETURNING *",
            [title, description]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("POST ERROR:", error);
        res.status(500).json({ message: "Failed to create post" });
    }
});




////////////////////////////////////////////////////////////
app.delete("/api/post/delete/:id", (req, res)=>{
    const id= Number(req.params.id);
    
})
app.delete("/api/post/delete/:id", (req, res) => {
    const id = Number(req.params.id);

    let post = posts.filter((post) => {
        console.log("🚀 ~ post:", post)
        return post.id !== id;
    })
    res.json({ message: "post deleted", post })
})