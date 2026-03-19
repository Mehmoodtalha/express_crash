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

///////////////get post by id without db///////////////////

// app.get("/api/posts/:id", (req, res) => {
//     const id = Number(req.params.id);
//     console.log("🚀 ~ id:", id)
//     res.json(posts.find((v) => v.id === id));
// });
///////////////get post by id with db///////////////////

app.get("/api/posts/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const result = await pool.query(
            'SELECT * FROM posts WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json({
            message: "Success",
            date: result.rows[0],
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed to get post by id" });
    }
});

///////////////update post by id with db///////////////////

app.put("/api/posts/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const {title, description}= req.body;
        const result = await pool.query(
            'UPDATE posts SET title = $1, description = $2 WHERE id = $3 RETURNING *',
            [title, description, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Post cannot be updated" });
        }

        res.status(200).json({
            message: "post updated successfully",
            data: result.rows[0],
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Failed to update post by id" });
    }
});

////////////////////////////////////////////////////////////
app.delete("/api/post/delete/:id", (req, res) => {
    const id = Number(req.params.id);

})
app.delete("/api/post/delete/:id", (req, res) => {
    const id = Number(req.params.id);

    let post = posts.filter((post) => {
        console.log("🚀 ~ post:", post)
        return post.id !== id;
    })
    res.json({ message: "post deleted", post })
})