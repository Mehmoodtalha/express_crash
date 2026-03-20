const express = require('express');
const path = require("path");
const pool = require("./db");
const { json } = require('stream/consumers');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// const { use } = require('react');




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
        const { title, description } = req.body;
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

//////////////delete post by id///////////////////////
app.delete("/api/post/delete/:id", async (req, res) => {

    try {
        const id = Number(req.params.id);
        const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Post not found" });
        }
        res.status(200).json({
            message: "post deleted successfully",
            data: result.rows[0],
        })

    } catch (e) {
        console.error(e);
        res.status(500), json({ messag: "Failed to delete post" })
    }

})

///////////////////signup///////////////////////////

app.post("/api/user/signup", async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            dob,
            gender,
            address,
            email,
            phone,
            password,
        } = req.body;

        if (!first_name || !last_name || !dob || !gender || !email || !password) {
            return res.status(400).json({ message: "Required fields are missing" });
        }

        if (password.length < 8) {
            return res
                .status(400)
                .json({ message: "Password must be at least 8 characters" });
        }

        const existingUser = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO users (first_name, last_name, dob, gender, address, email, phone, password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, first_name, last_name, dob, gender, address, email, phone, created_at",
            [first_name, last_name, dob, gender, address, email, phone, hashedPassword]
        );

        const user = result.rows[0];

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(201).json({
            message: "User sign up successful",
            token,
            user,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "User sign up failed" });
    }
});

///////////////////////login /////////////////////////

app.post("/api/user/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = result.rows[0];

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.status(200).json({
            message: "Logged in successfully",
            token,
            data: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                dob: user.dob,
                gender: user.gender,
                address: user.address,
                email: user.email,
                phone: user.phone,
                created_at: user.created_at,
            },
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Login failed" });
    }
});
