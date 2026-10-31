import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

    return {
        plugins: [
            react(),
            {
                name: "local-api",
                configureServer(server) {
                    server.middlewares.use("/api", async (req, res) => {
                        try {
                            const url = new URL(req.url, "https://localhost");
                            const name = url.pathname
                                .replace(/^\//, "")
                                .replace(/[^a-z0-9-]/gi, "");
                            req.query = Object.fromEntries(url.searchParams);
                            let body = "";
                            for await (const chunk of req) body += chunk;
                            req.body = body ? JSON.parse(body) : {};

                            res.status = (code) => {
                                res.statusCode = code;
                                return res;
                            };

                            res.json = (data) => {
                                res.setHeader("Content-Type", "application/json");
                                res.end(JSON.stringify(data));
                            };

                            const { default: handler } = await server.ssrLoadModule(`/api/${name}.js`);
                            await handler(req, res);
                        } catch (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.setHeader("Content-Type", "application/json");
                            res.end(JSON.stringify({ error: "Local API error. Check the terminal." }));
                        }
                    });
                },
            },
        ],
    };
});