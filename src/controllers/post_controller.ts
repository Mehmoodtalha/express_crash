import { Response } from "express";
import pool from "../db/postgres";
import redisClient from "../db/redis";
import { AuthenticatedRequest } from "../middleware/auth";
import { PostBody } from "../types/post";
import prisma from "../db/prisma"


//////////////////create post
export const createPost = async (
    req: AuthenticatedRequest<{}, unknown, PostBody>,
    res: Response
) => {
    try {
        const { title, description } = req.body;
        const post = await prisma.posts.create({ data: { title, description } })
        // const result = await pool.query(
        //     "INSERT INTO posts (title, description) VALUES ($1, $2) RETURNING *",
        //     [title, description]
        // );

        res.status(201).json(post);
    } catch (error) {
        console.error("POST ERROR:", error);
        res.status(500).json({ message: "Failed to create post" });
    }
};
///////////////get post by id
export const getPostById = async (
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
) => {
    try {
        const id = Number(req.params.id);
        const cacheKey = `post:${id}`;

        const cachedPost = await redisClient.get(cacheKey);

        if (cachedPost) {
            return res.status(200).json({
                message: "Success",
                data: JSON.parse(cachedPost),
                source: "redis",
            });
        }

        // const result = await pool.query("SELECT * FROM posts WHERE id = $1", [id]);
        const post = await prisma.posts.findUnique({ where: { id } });
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // const post = result.rows[0];

        await redisClient.set(cacheKey, JSON.stringify(post), { EX: 300 });

        res.status(200).json({
            message: "Success",
            data: post,
            source: "database",
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to get post by id" });
    }
};


//////////////////get all posts
/// with prisma
export const getAllPosts = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const page = Number(req.query.page) || 1;
        const perPage = Number(req.query.per_page) || 10;
        const search = String(req.query.search || "").trim();

        const skip = (page - 1) * perPage;

        const where = search
            ? {
                OR: [
                    { title: { contains: search, mode: "insensitive" as const } },
                    { description: { contains: search, mode: "insensitive" as const } },
                ],
            }
            : {};

        const posts = await prisma.posts.findMany({
            where,
            skip,
            take: perPage,
            orderBy: {
                id: "asc",
            },
        });

        const totalItems = await prisma.posts.count({
            where,
        });

        const totalPages = Math.ceil(totalItems / perPage);

        res.status(200).json({
            data: posts,
            meta: {
                perPageCount: posts.length,
                totalItems,
                totalPages,
                currentPage: page,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch posts" });
    }
};

//////////////with raw sql qurie
// export const getAllPosts = async (req: AuthenticatedRequest, res: Response) => {
//     try {
//         const page = Number(req.query.page) || 1;
//         const perPage = Number(req.query.perpage) || 10;
//         const search = String(req.query.search || "").trim();
//         const offset = (page - 1) * perPage;
//         let dataQuery = "SELECT * FROM posts";
//         let countQuery = "SELECT COUNT(*) FROM posts";
//         let queryParams: (string | number)[] = [];
//         let countParams: (string | number)[] = [];

//         if (search) {
//             dataQuery += " WHERE title ILIKE $1 OR description ILIKE $1";
//             countQuery += " WHERE title ILIKE $1 OR description ILIKE $1";
//             queryParams.push(`%${search}%`);
//             countParams.push(`%${search}%`);
//         }
//         dataQuery += ` ORDER BY id ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
//         queryParams.push(perPage, offset);

//         const postsResult = await pool.query(dataQuery, queryParams);
//         const countResult = await pool.query(countQuery, countParams);

//         const totalItems = Number(countResult.rows[0].count);
//         const totalPages = Math.ceil(totalItems / perPage);

//         res.status(200).json({
//             data: postsResult.rows,
//             meta: {
//                 perPageCount: postsResult.rows.length,
//                 totalItems,
//                 totalPages,
//                 currentPage: page,
//             },
//         });
//         //without pagination
//         // const result = await pool.query("SELECT * FROM posts ORDER BY id ASC");
//         // res.json(result.rows);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Failed to fetch posts" });
//     }
// };

///////////////// update post
export const updatePost = async (
    req: AuthenticatedRequest<{ id: string }, unknown, PostBody>,
    res: Response
) => {
    try {
        const id = Number(req.params.id);
        const { title, description } = req.body;
        const existingPost = await prisma.posts.findUnique({ where: { id } });

        if (!existingPost) {
            return res.status(404).json({ message: "Post cannot be updated" });
        }

        const post = await prisma.posts.update({
            where: { id },
            data: { title, description }
        });
        // const result = await pool.query(
        //     "UPDATE posts SET title = $1, description = $2 WHERE id = $3 RETURNING *",
        //     [title, description, id]
        // );
        // if(result.rows.length===0)
        // if (!post) {
        //     return res.status(404).json({ message: "Post cannot be updated" });
        // }
        await redisClient.del(`post:${id}`);

        res.status(200).json({
            message: "Post updated successfully",
            data: post,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update post by id" });
    }
};
///////////////delete post by id
export const deletePost = async (
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
) => {
    try {
        const id = Number(req.params.id);
        const existingPost = await prisma.posts.findUnique({ where: { id } });
        // const result = await pool.query(
        //     "DELETE FROM posts WHERE id = $1 RETURNING *",
        //     [id]
        // );

        // if (result.rows.length === 0) {
        if (!existingPost) {
            return res.status(404).json({ message: "Post not found" });
        }

        const post = await prisma.posts.delete({ where: { id } });

        await redisClient.del(`post:${id}`);

        res.status(200).json({
            message: "Post deleted successfully",
            data: post,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete post" });
    }
};
